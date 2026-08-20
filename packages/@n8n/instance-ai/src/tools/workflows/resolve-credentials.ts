/**
 * Credential Resolution
 *
 * Shared helper that resolves undefined/null credentials in WorkflowJSON.
 * Unresolvable credentials are removed ("mocked") and reported via the mock
 * metadata fields; the node simulation plan (classify-node-destructiveness)
 * picks mocked nodes up and pins them with generated fixtures at verify time.
 */

import { TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE } from '@n8n/api-types';
import type { NodeJSON, WorkflowJSON } from '@n8n/workflow-sdk';

import {
	AI_GATEWAY_CREDENTIAL,
	GENERIC_AUTH_CREDENTIAL_TYPES,
	N8N_CONNECT_DISPLAY_NAME,
} from './credential-utils';
import type { ResolvedCredential } from './resolved-credential.schema';
import {
	getCredentialActivationParameters,
	getCredentialActivationState,
	getValidCredentialTypes,
	resolveSupportedSiblingCredentialType,
} from './setup-workflow.service';
import type { InstanceAiContext } from '../../types';

export type { ResolvedCredential };

/** Flat credential entry — preserves duplicates of the same type. */
export interface CredentialEntry {
	id: string;
	name: string;
	type: string;
}

/**
 * Credential map passed from the orchestrator.
 * Keyed by credential type (e.g., "openAiApi", "gmailOAuth2", "slackApi").
 */
export type CredentialMap = Map<string, CredentialEntry[]>;

/**
 * Build a credential map from all available credentials.
 * Non-fatal — returns an empty map if listing fails.
 */
export async function buildCredentialMap(
	credentialService: Pick<InstanceAiContext['credentialService'], 'list'>,
): Promise<CredentialMap> {
	const map: CredentialMap = new Map();
	try {
		const allCreds = await credentialService.list();
		for (const cred of allCreds) {
			const entries = map.get(cred.type) ?? [];
			entries.push({ id: cred.id, name: cred.name, type: cred.type });
			map.set(cred.type, entries);
		}
	} catch {
		// Non-fatal — credentials will be unresolved
	}
	return map;
}

/** Result of credential resolution — mock metadata for the simulation plan. */
export interface CredentialResolutionResult {
	/** Node names whose credentials were mocked. */
	mockedNodeNames: string[];
	/** Credential types that were mocked (deduplicated). */
	mockedCredentialTypes: string[];
	/** Map of node name → credential types that were mocked on that node. */
	mockedCredentialsByNode: Record<string, string[]>;
	/**
	 * Credential types from `preferNewCredentialTypes` the resolver actually left
	 * open for the user to create. Not derivable from `mockedCredentialTypes`: a
	 * slot the source omitted entirely is held by the required-type pass, which
	 * attaches nothing and therefore mocks nothing.
	 */
	heldForNewCredentialTypes: string[];
	/**
	 * Map of node name → credentials the resolver attached automatically
	 * (restored from the saved workflow or auto-bound to the sole existing
	 * candidate). These nodes are already connected — the agent must not ask
	 * the user to connect or create them.
	 */
	resolvedCredentialsByNode: Record<string, ResolvedCredential[]>;
}

/**
 * Human-readable summary of automatically attached credentials, meant to be
 * relayed on the build result so the agent knows setup is not needed for them.
 */
export function buildCredentialResolutionNote(
	resolvedCredentialsByNode: Record<string, ResolvedCredential[]>,
	heldForNewCredentialTypes: readonly string[] = [],
): string | undefined {
	const storedParts: string[] = [];
	const gatewayParts: string[] = [];
	for (const [nodeName, resolved] of Object.entries(resolvedCredentialsByNode)) {
		for (const credential of resolved) {
			const label = `(${credential.type}) on node "${nodeName}"`;
			if (credential.id === null) gatewayParts.push(label);
			else storedParts.push(`"${credential.name}" ${label}`);
		}
	}
	if (
		storedParts.length === 0 &&
		gatewayParts.length === 0 &&
		heldForNewCredentialTypes.length === 0
	) {
		return undefined;
	}

	const sentences: string[] = [];
	if (heldForNewCredentialTypes.length > 0) {
		// Restate the request the flag encodes: the next setup call has to repeat it,
		// or the card falls back to preselecting an existing credential.
		sentences.push(
			`Left unresolved because the user asked to create them fresh: ${heldForNewCredentialTypes.join(', ')}. ` +
				`Route these to credential setup and pass preferNewCredentials: ${JSON.stringify(heldForNewCredentialTypes)} ` +
				'so the card opens on credential creation instead of preselecting an existing credential.',
		);
	}
	if (storedParts.length > 0) {
		sentences.push(`Connected existing credential(s) automatically: ${storedParts.join('; ')}.`);
	}
	if (gatewayParts.length > 0) {
		sentences.push(
			`Set up automatically with n8n credits (no API key required) for: ${gatewayParts.join('; ')}.`,
		);
	}
	if (storedParts.length > 0 || gatewayParts.length > 0) {
		// Scoped to what was actually attached — a type held back for fresh creation
		// must still be routed to setup.
		sentences.push(
			'Those attached credentials are already set up — do not ask the user to connect or create them, and do not route them to credential setup.',
		);
	}
	if (gatewayParts.length > 0) {
		sentences.push(
			'Briefly let the user know these run on n8n credits and work out of the box, and that they can switch to their own key anytime by editing the credential on the node.',
		);
	}
	return sentences.join(' ');
}

/**
 * Resolve undefined/null credentials in the workflow JSON.
 *
 * `newCredential()` produces `NewCredentialImpl` which serializes to `undefined`
 * in `toJSON()`. Resolution strategy (in order):
 * 1. Restore from the existing workflow (preserve the user's chosen credential on updates)
 * 2. Preserve explicit valid raw credential ids
 * 3. Mock: remove the credential key and report the node in the mock metadata
 *
 * `preferNewCredentialTypes` opts a type out of every automatic attachment: the
 * user asked for a fresh credential, so an unresolved slot of that type is
 * mocked and left for credential setup instead of being silently filled from a
 * sibling node, the saved workflow, the sole stored candidate, or n8n credits.
 *
 * Nothing is ever written into json.pinData — the saved workflow stays clean.
 */
export async function resolveCredentials(
	json: WorkflowJSON,
	workflowId: string | undefined,
	ctx: InstanceAiContext,
	availableCredentials?: CredentialMap,
	preferNewCredentialTypes?: readonly string[],
): Promise<CredentialResolutionResult> {
	const preferNewTypes = new Set(preferNewCredentialTypes ?? []);
	const heldForNewCredentialTypes = new Set<string>();
	const mockedNodeNames: string[] = [];
	const mockedCredentialTypesSet = new Set<string>();
	const mockedCredentialsByNode: Record<string, string[]> = {};
	const resolvedCredentialsByNode: Record<string, ResolvedCredential[]> = {};

	// n8n credits support is process-global config; memoize per type for this call.
	const gatewaySupportCache = new Map<string, boolean>();
	const isGatewayCredentialType = async (credType: string): Promise<boolean> => {
		if (!ctx.credentialService.isAiGatewayCredentialType) return false;
		const cached = gatewaySupportCache.get(credType);
		if (cached !== undefined) return cached;
		const supported = await ctx.credentialService
			.isAiGatewayCredentialType(credType)
			.catch(() => false);
		gatewaySupportCache.set(credType, supported);
		return supported;
	};

	const hasStoredCredential = (credType: string): boolean =>
		(availableCredentials?.get(credType)?.length ?? 0) > 0;

	// Fallback for a gateway-unsupported slot: a supported sibling credential type
	// the node can be switched to. See resolveSupportedSiblingCredentialType.
	const resolveSupportedSiblingType = async (
		node: NodeJSON,
		unsupportedType: string,
	): Promise<string | undefined> =>
		await resolveSupportedSiblingCredentialType(
			ctx,
			node,
			unsupportedType,
			isGatewayCredentialType,
			hasStoredCredential,
		);

	// Managed OAuth (instance-provided OAuth client) is instance-global config;
	// memoize per type for this call.
	const managedOAuthCache = new Map<string, boolean>();
	const isManagedOAuthType = async (credType: string): Promise<boolean> => {
		if (!ctx.credentialService.isManagedOAuthCredentialType) return false;
		const cached = managedOAuthCache.get(credType);
		if (cached !== undefined) return cached;
		const supported = await ctx.credentialService
			.isManagedOAuthCredentialType(credType)
			.catch(() => false);
		managedOAuthCache.set(credType, supported);
		return supported;
	};

	// Fallback for a slot the user would otherwise fill by hand: a sibling
	// credential type whose OAuth client the instance provides, so setup offers
	// one-click connect instead of an API-key form (INS-973).
	const resolveManagedOAuthSiblingType = async (
		node: NodeJSON,
		currentType: string,
	): Promise<string | undefined> =>
		await resolveSupportedSiblingCredentialType(
			ctx,
			node,
			currentType,
			isManagedOAuthType,
			hasStoredCredential,
		);

	// Switch the node's parameters so the attached credential type is the active
	// slot (e.g. set `authentication` to match). No-op when the slot is already
	// active (never rewrite a valid value) or no switch can reach it (version-gated).
	const applyManagedAuth = async (node: NodeJSON, credentialType: string): Promise<void> => {
		let nodeDesc: Awaited<ReturnType<typeof ctx.nodeService.getDescription>> | undefined;
		try {
			nodeDesc = await ctx.nodeService.getDescription(node.type, node.typeVersion ?? 1);
		} catch {
			return;
		}
		const credential = nodeDesc?.credentials?.find((cred) => cred.name === credentialType);
		if (!credential || getCredentialActivationState(node, credential) !== 'activatable') return;
		const activation = getCredentialActivationParameters(credential.displayOptions);
		if (Object.keys(activation).length > 0) {
			node.parameters = { ...node.parameters, ...activation };
		}
	};

	// Build a map of existing credentials by node name (for updates)
	const existingCredsByNode = new Map<string, Record<string, unknown>>();
	if (workflowId) {
		try {
			const existing = await ctx.workflowService.getAsWorkflowJSON(workflowId);
			for (const existingNode of existing.nodes ?? []) {
				if (existingNode.credentials && existingNode.name) {
					existingCredsByNode.set(
						existingNode.name,
						existingNode.credentials as Record<string, unknown>,
					);
				}
			}
		} catch {
			// Can't fetch existing — will try other strategies
		}
	}

	// First stored-credential binding per type, across the in-flight JSON and the
	// saved workflow, so per-slot sibling reuse below is a map lookup instead of a
	// rescan of every node. Bindings created during resolution register themselves
	// so they stay visible to later slots of the same type.
	const siblingBindingsByType = new Map<string, { id: string; name: string }>();
	const registerSiblingBinding = (credentialType: string, value: unknown) => {
		// A generic-auth binding on a sibling node may belong to a different
		// service than this node calls, so it never qualifies for reuse.
		// (Templated Custom Auth instances do record their serviceHost, but
		// matching it against the node's target URL is the setup card's job.)
		if (GENERIC_AUTH_CREDENTIAL_TYPES.has(credentialType)) return;
		if (siblingBindingsByType.has(credentialType)) return;
		const id = getCredentialId(value);
		if (!id) return;
		if (!isKnownCredentialForType(value, credentialType, availableCredentials)) return;
		siblingBindingsByType.set(credentialType, { id, name: getCredentialName(value) ?? id });
	};
	for (const node of json.nodes ?? []) {
		for (const [credentialType, value] of Object.entries(node.credentials ?? {})) {
			registerSiblingBinding(credentialType, value);
		}
	}
	for (const savedCreds of existingCredsByNode.values()) {
		for (const [credentialType, value] of Object.entries(savedCreds)) {
			registerSiblingBinding(credentialType, value);
		}
	}

	for (const node of json.nodes ?? []) {
		if (!node.credentials) continue;
		const creds = node.credentials as Record<string, unknown>;
		let nodeMocked = false;

		for (const [key, value] of Object.entries(creds)) {
			// Try 1: restore from existing workflow (preserves the user's chosen credential
			// when the LLM drops the id during an edit — e.g., emits newCredential('name')
			// without the id, which serializes to undefined).
			const existingCreds = node.name ? existingCredsByNode.get(node.name) : undefined;

			// The user asked to create this credential, so no automatic attachment may
			// answer the slot on their behalf — it goes to setup unresolved.
			const wantsNewCredential = preferNewTypes.has(key);

			const recordResolvedCredential = (id: string, name: string) => {
				if (!node.name) return;
				resolvedCredentialsByNode[node.name] ??= [];
				resolvedCredentialsByNode[node.name].push({ type: key, id, name });
			};

			const restoreExistingCredential = () => {
				if (wantsNewCredential) return false;
				const restored = existingCreds?.[key];
				if (!restored) return false;
				creds[key] = restored;
				const restoredId = getCredentialId(restored);
				if (restoredId) {
					recordResolvedCredential(restoredId, getCredentialName(restored) ?? restoredId);
				}
				cleanupMockPinData(json, node.name);
				return true;
			};

			// Try 2: reuse a credential of the same type already bound to another
			// node (in the in-flight JSON or the saved workflow). The workflow has
			// already settled on that credential for the service, so a new node of
			// the same service must not re-prompt setup for it.
			const reuseSiblingNodeCredential = () => {
				if (wantsNewCredential) return false;
				const sibling = siblingBindingsByType.get(key);
				if (!sibling) return false;
				creds[key] = { id: sibling.id, name: sibling.name };
				recordResolvedCredential(sibling.id, sibling.name);
				cleanupMockPinData(json, node.name);
				return true;
			};

			const mockCredential = (credentialType = key) => {
				const nodeName = node.name ?? '';
				delete creds[key];
				mockedCredentialTypesSet.add(credentialType);
				nodeMocked = true;

				if (nodeName) {
					// Track which credential types were mocked on this node. The node
					// simulation plan forces these nodes to `simulate`, so verification
					// pins them with generated fixtures instead of executing them.
					mockedCredentialsByNode[nodeName] ??= [];
					mockedCredentialsByNode[nodeName].push(credentialType);
				}
			};

			// Wire n8n Connect: attach the managed marker so the saved workflow runs
			// zero-setup in production, and record it as resolved so the agent treats
			// the node as connected (no credential-setup routing). The node stays in
			// the simulation set (`nodeMocked`) so verification pins it instead of
			// spending gateway quota, but it is NOT added to `mockedCredentialsByNode`
			// — that channel means "needs a real credential", which this node doesn't.
			const attachGatewayCredential = async (credentialType = key) => {
				creds[credentialType] = { ...AI_GATEWAY_CREDENTIAL, name: N8N_CONNECT_DISPLAY_NAME };
				await applyManagedAuth(node, credentialType);
				nodeMocked = true;
				if (node.name) {
					resolvedCredentialsByNode[node.name] ??= [];
					const resolved = resolvedCredentialsByNode[node.name];
					// The type may already be recorded when the LLM wrote several slots
					// and an earlier one attached it as its sibling — don't record twice.
					if (!resolved.some((cred) => cred.type === credentialType && cred.id === null)) {
						resolved.push({
							type: credentialType,
							id: null,
							name: N8N_CONNECT_DISPLAY_NAME,
							__aiGatewayManaged: true,
						});
					}
				}
			};

			// With no stored credential for the type, prefer n8n credits over mocking:
			// attach directly if the written type is gateway-supported, else attach to
			// a supported sibling (switching auth to it) and drop the unusable slot.
			// With no gateway option either, still prefer a managed-OAuth sibling —
			// switch auth to it and mock under that type, so setup asks for one-click
			// OAuth instead of an API key.
			const mockOrAttachGateway = async () => {
				// n8n credits is still an existing credential from the user's point of
				// view — they asked to create their own, so don't answer with ours.
				if (wantsNewCredential) {
					mockCredential();
					heldForNewCredentialTypes.add(key);
					return;
				}
				if (!hasStoredCredential(key)) {
					if (await isGatewayCredentialType(key)) {
						await attachGatewayCredential();
						return;
					}
					const siblingType = await resolveSupportedSiblingType(node, key);
					if (siblingType) {
						delete creds[key];
						await attachGatewayCredential(siblingType);
						return;
					}
					const managedOAuthSibling = await resolveManagedOAuthSiblingType(node, key);
					if (managedOAuthSibling) {
						await applyManagedAuth(node, managedOAuthSibling);
						mockCredential(managedOAuthSibling);
						return;
					}
				}
				mockCredential();
			};

			if (value !== undefined && value !== null) {
				// Templated Custom Auth ids are service-agnostic at the type level, so a
				// model-attached reference can silently wire another service's credential
				// (e.g. a Pexels key onto fal.ai nodes). Trust it only when it matches the
				// node's own prior wiring; anything fresh routes through credential setup,
				// where the card offers existing credentials without silently applying one.
				if (key === TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE) {
					const suppliedId = getCredentialId(value);
					const priorId = getCredentialId(existingCreds?.[key]);
					if (suppliedId !== undefined && suppliedId === priorId) {
						cleanupMockPinData(json, node.name);
						continue;
					}
					if (restoreExistingCredential()) {
						continue;
					}
					await mockOrAttachGateway();
					continue;
				}
				if (isKnownCredentialForType(value, key, availableCredentials)) {
					cleanupMockPinData(json, node.name);
					continue;
				}
				if (restoreExistingCredential()) {
					continue;
				}
				if (reuseSiblingNodeCredential()) {
					continue;
				}
				await mockOrAttachGateway();
				continue;
			}

			if (restoreExistingCredential()) {
				continue;
			}

			if (reuseSiblingNodeCredential()) {
				continue;
			}

			// The sole-credential fallback is skipped for generic auth types: one
			// type serves every service, so "the only stored credential" may belong
			// to a different service and must not be sent to this node's URL — mock
			// instead so setup asks.
			const credentialsForType = availableCredentials?.get(key);
			if (
				!wantsNewCredential &&
				credentialsForType?.length === 1 &&
				!GENERIC_AUTH_CREDENTIAL_TYPES.has(key)
			) {
				const [credential] = credentialsForType;
				creds[key] = { id: credential.id, name: credential.name };
				registerSiblingBinding(key, creds[key]);
				recordResolvedCredential(credential.id, credential.name);
				cleanupMockPinData(json, node.name);
				continue;
			}

			// No stored credential and not gateway-supported — mock: remove the
			// credential key and produce sidecar verification data so the execution
			// engine skips this node during test runs.
			await mockOrAttachGateway();
		}

		if (nodeMocked && node.name) {
			mockedNodeNames.push(node.name);
		}
	}

	// Second pass — required-but-omitted credentials. The first pass only visits
	// slots the LLM wrote; a node missing a slot for a type it requires reaches
	// post-build setup credential-less and surfaces a setup card. Required types
	// come from the node description; silently attach n8n credits when the node has
	// no entry and no stored credential, and the type — or a supported sibling its
	// auth is switched to — is gateway-supported. Otherwise leave it for setup.
	for (const node of json.nodes ?? []) {
		if (!node.name) continue;
		const requiredTypes = await getValidCredentialTypes(ctx, node);
		for (const credType of requiredTypes) {
			const creds = (node.credentials ?? {}) as Record<string, unknown>;
			const existing = creds[credType];
			if (existing !== undefined && existing !== null) continue;
			// Asked-for-fresh types stay open for setup — never pre-answered with credits.
			// Checked before the stored-credential bail so the type is reported as held
			// either way: this pass attaches nothing, so it mocks nothing, and the build
			// result would otherwise carry no trace of the request for the setup call.
			if (preferNewTypes.has(credType)) {
				heldForNewCredentialTypes.add(credType);
				continue;
			}
			if (hasStoredCredential(credType)) continue;

			let managedType = credType;
			if (!(await isGatewayCredentialType(credType))) {
				const siblingType = await resolveSupportedSiblingType(node, credType);
				if (!siblingType) {
					// No n8n-credits option — still prefer a managed-OAuth sibling so
					// setup offers one-click OAuth instead of an API-key form. Nothing
					// is attached; the slot stays open for setup like today.
					const managedOAuthSibling = await resolveManagedOAuthSiblingType(node, credType);
					if (managedOAuthSibling) await applyManagedAuth(node, managedOAuthSibling);
					continue;
				}
				managedType = siblingType;
			}

			node.credentials ??= {};
			(node.credentials as Record<string, unknown>)[managedType] = {
				...AI_GATEWAY_CREDENTIAL,
				name: N8N_CONNECT_DISPLAY_NAME,
			};
			await applyManagedAuth(node, managedType);
			resolvedCredentialsByNode[node.name] ??= [];
			resolvedCredentialsByNode[node.name].push({
				type: managedType,
				id: null,
				name: N8N_CONNECT_DISPLAY_NAME,
				__aiGatewayManaged: true,
			});
			// Simulate during verification instead of spending gateway quota.
			if (!mockedNodeNames.includes(node.name)) mockedNodeNames.push(node.name);
		}
	}

	return {
		mockedNodeNames,
		mockedCredentialTypes: [...mockedCredentialTypesSet],
		mockedCredentialsByNode,
		heldForNewCredentialTypes: [...heldForNewCredentialTypes],
		resolvedCredentialsByNode,
	};
}

function getCredentialId(value: unknown): string | undefined {
	if (typeof value !== 'object' || value === null || !('id' in value)) return undefined;

	const { id } = value;
	if (typeof id !== 'string' || id.trim() === '') return undefined;

	return id;
}

function getCredentialName(value: unknown): string | undefined {
	if (typeof value !== 'object' || value === null || !('name' in value)) return undefined;

	const { name } = value;
	if (typeof name !== 'string' || name.trim() === '') return undefined;

	return name;
}

function isKnownCredentialForType(
	value: unknown,
	credentialType: string,
	availableCredentials: CredentialMap | undefined,
): boolean {
	if (!availableCredentials) return true;

	const id = getCredentialId(value);
	if (!id) return false;

	return (
		availableCredentials.get(credentialType)?.some((credential) => credential.id === id) ?? false
	);
}

/**
 * Legacy cleanup: remove mock pinData markers from workflows saved before the
 * sidecar verification data refactor. New builds never write `_mockedCredential`
 * to `json.pinData`, but old workflows may still have them.
 */
function cleanupMockPinData(json: WorkflowJSON, nodeName: string | undefined): void {
	if (!nodeName || !json.pinData?.[nodeName]) return;
	const items = json.pinData[nodeName];
	if (items.length === 1 && '_mockedCredential' in items[0]) {
		delete json.pinData[nodeName];
	}
}
