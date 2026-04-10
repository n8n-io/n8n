/**
 * Credential Resolution
 *
 * Shared helper that resolves undefined/null credentials in WorkflowJSON.
 * Produces sidecar verification pin data instead of mutating the workflow's pinData.
 */

import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../types';

/**
 * Credential map passed from the orchestrator.
 * Keyed by credential type (e.g., "openAiApi", "gmailOAuth2", "slackApi").
 */
export type CredentialMap = Map<string, { id: string; name: string }>;

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
			map.set(cred.type, { id: cred.id, name: cred.name });
		}
	} catch {
		// Non-fatal — credentials will be unresolved
	}
	return map;
}

/** Result of credential resolution — includes mock metadata and sidecar verification data. */
export interface CredentialResolutionResult {
	/** Node names whose credentials were mocked. */
	mockedNodeNames: string[];
	/** Credential types that were mocked (deduplicated). */
	mockedCredentialTypes: string[];
	/** Map of node name → credential types that were mocked on that node. */
	mockedCredentialsByNode: Record<string, string[]>;
	/** Pin data for verification only — NEVER written to workflow JSON. */
	verificationPinData: Record<string, Array<Record<string, unknown>>>;
}

/**
 * Resolve undefined/null credentials in the workflow JSON.
 *
 * `newCredential()` produces `NewCredentialImpl` which serializes to `undefined`
 * in `toJSON()`. Resolution strategy (in order):
 * 1. Match by credential type from the credential map (orchestrator = source of truth)
 * 2. Restore from the existing workflow (for update flows)
 * 3. Mock: remove the credential key and produce sidecar verification pin data
 *
 * Mocked credentials produce verification-only pin data that is returned separately
 * and NEVER written into json.pinData. The saved workflow stays clean.
 */
export async function resolveCredentials(
	json: WorkflowJSON,
	workflowId: string | undefined,
	ctx: InstanceAiContext,
	credentialMap: CredentialMap,
): Promise<CredentialResolutionResult> {
	const mockedNodeNames: string[] = [];
	const mockedCredentialTypesSet = new Set<string>();
	const mockedCredentialsByNode: Record<string, string[]> = {};
	const verificationPinData: Record<string, Array<Record<string, unknown>>> = {};

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
			if (value !== undefined && value !== null) continue;

			// Try 1: look up by credential type from the map (e.g., key="openAiApi")
			const fromMap = credentialMap.get(key);
			if (fromMap) {
				creds[key] = fromMap;
				cleanupMockPinData(json, node.name);
				continue;
			}

			// Try 2: restore from existing workflow (for nodes that already existed)
			const existingCreds = node.name ? existingCredsByNode.get(node.name) : undefined;
			if (existingCreds?.[key]) {
				creds[key] = existingCreds[key];
				cleanupMockPinData(json, node.name);
				continue;
			}

			// Try 3: Mock — remove the credential key and produce sidecar verification data.
			// The credential key is deleted so the saved workflow doesn't reference a
			// non-existent credential. Verification pin data is produced so the execution
			// engine can skip this node during test runs.
			const nodeName = node.name ?? '';
			delete creds[key];
			mockedCredentialTypesSet.add(key);
			nodeMocked = true;

			if (nodeName) {
				// Track which credential types were mocked on this node
				mockedCredentialsByNode[nodeName] ??= [];
				mockedCredentialsByNode[nodeName].push(key);

				// Produce sidecar verification pin data (never saved to workflow).
				// If the workflow already has real pinData for this node, skip — the
				// existing pinData will suffice for execution skipping.
				if (!(json.pinData && nodeName in json.pinData)) {
					verificationPinData[nodeName] ??= [];
					if (verificationPinData[nodeName].length === 0) {
						verificationPinData[nodeName].push({ _mockedCredential: key });
					}
				}
			}
		}

		if (nodeMocked && node.name) {
			mockedNodeNames.push(node.name);
		}
	}

	return {
		mockedNodeNames,
		mockedCredentialTypes: [...mockedCredentialTypesSet],
		mockedCredentialsByNode,
		verificationPinData,
	};
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
