/**
 * Credential Resolution
 *
 * Shared helper that resolves undefined/null credentials in WorkflowJSON.
 * Unresolvable credentials are removed ("mocked") and reported via the mock
 * metadata fields; the node simulation plan (classify-node-destructiveness)
 * picks mocked nodes up and pins them with generated fixtures at verify time.
 */

import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../types';

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

/** A credential the resolver attached to a node without an explicit id in the source. */
export interface ResolvedCredential {
	/** Credential type key on the node, e.g. "openAiApi". */
	type: string;
	id: string;
	name: string;
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
): string | undefined {
	const parts: string[] = [];
	for (const [nodeName, resolved] of Object.entries(resolvedCredentialsByNode)) {
		for (const credential of resolved) {
			parts.push(`"${credential.name}" (${credential.type}) on node "${nodeName}"`);
		}
	}
	if (parts.length === 0) return undefined;
	return `Connected existing credential(s) automatically: ${parts.join('; ')}. These are already set up — do not ask the user to connect or create them, and do not route them to credential setup.`;
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
 * Nothing is ever written into json.pinData — the saved workflow stays clean.
 */
export async function resolveCredentials(
	json: WorkflowJSON,
	workflowId: string | undefined,
	ctx: InstanceAiContext,
	availableCredentials?: CredentialMap,
): Promise<CredentialResolutionResult> {
	const mockedNodeNames: string[] = [];
	const mockedCredentialTypesSet = new Set<string>();
	const mockedCredentialsByNode: Record<string, string[]> = {};
	const resolvedCredentialsByNode: Record<string, ResolvedCredential[]> = {};

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

	for (const node of json.nodes ?? []) {
		if (!node.credentials) continue;
		const creds = node.credentials as Record<string, unknown>;
		let nodeMocked = false;

		for (const [key, value] of Object.entries(creds)) {
			// Try 1: restore from existing workflow (preserves the user's chosen credential
			// when the LLM drops the id during an edit — e.g., emits newCredential('name')
			// without the id, which serializes to undefined).
			const existingCreds = node.name ? existingCredsByNode.get(node.name) : undefined;

			const recordResolvedCredential = (id: string, name: string) => {
				if (!node.name) return;
				resolvedCredentialsByNode[node.name] ??= [];
				resolvedCredentialsByNode[node.name].push({ type: key, id, name });
			};

			const restoreExistingCredential = () => {
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

			const mockCredential = () => {
				const nodeName = node.name ?? '';
				delete creds[key];
				mockedCredentialTypesSet.add(key);
				nodeMocked = true;

				if (nodeName) {
					// Track which credential types were mocked on this node. The node
					// simulation plan forces these nodes to `simulate`, so verification
					// pins them with generated fixtures instead of executing them.
					mockedCredentialsByNode[nodeName] ??= [];
					mockedCredentialsByNode[nodeName].push(key);
				}
			};

			if (value !== undefined && value !== null) {
				if (isKnownCredentialForType(value, key, availableCredentials)) {
					cleanupMockPinData(json, node.name);
					continue;
				}
				if (restoreExistingCredential()) {
					continue;
				}
				mockCredential();
				continue;
			}

			if (restoreExistingCredential()) {
				continue;
			}

			const credentialsForType = availableCredentials?.get(key);
			if (credentialsForType?.length === 1) {
				const [credential] = credentialsForType;
				creds[key] = { id: credential.id, name: credential.name };
				recordResolvedCredential(credential.id, credential.name);
				cleanupMockPinData(json, node.name);
				continue;
			}

			// Mock — remove the credential key and produce sidecar verification data.
			// The credential key is deleted so the saved workflow doesn't reference a
			// non-existent credential. Verification pin data is produced so the execution
			// engine can skip this node during test runs.
			mockCredential();
		}

		if (nodeMocked && node.name) {
			mockedNodeNames.push(node.name);
		}
	}

	return {
		mockedNodeNames,
		mockedCredentialTypes: [...mockedCredentialTypesSet],
		mockedCredentialsByNode,
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
