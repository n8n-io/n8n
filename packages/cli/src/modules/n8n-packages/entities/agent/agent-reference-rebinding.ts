import {
	AgentJsonConfigSchema,
	AI_GATEWAY_MANAGED_TAG,
	MANAGED_CREDENTIAL_TOKEN,
	type AgentJsonConfig,
} from '@n8n/api-types';

import type { PackageImportBindings } from '../../n8n-packages.types';

const MANAGED_CREDENTIAL_IDS = new Set<string>([MANAGED_CREDENTIAL_TOKEN, AI_GATEWAY_MANAGED_TAG]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Managed tokens and blanks pass through; anything else maps via bindings or blanks. */
function rebindCredentialId(value: unknown, credentials: Map<string, string>): unknown {
	if (typeof value !== 'string' || value === '' || MANAGED_CREDENTIAL_IDS.has(value)) return value;
	return credentials.get(value) ?? '';
}

function rebindValue(value: unknown, bindings: PackageImportBindings): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) => rebindValue(entry, bindings));
	}

	if (!isRecord(value)) return value;

	const rebound: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(value)) {
		if ((key === 'credential' || key === 'credentialId') && typeof entry === 'string') {
			rebound[key] = rebindCredentialId(entry, bindings.credentials);
			continue;
		}

		if (key === 'credentials' && isRecord(entry)) {
			rebound[key] = Object.fromEntries(
				Object.entries(entry).map(([credType, credRef]) => {
					if (!isRecord(credRef) || typeof credRef.id !== 'string') return [credType, credRef];
					return [
						credType,
						{ ...credRef, id: rebindCredentialId(credRef.id, bindings.credentials) },
					];
				}),
			);
			continue;
		}

		// A workflow tool the package carried maps to its imported id; an unbound
		// reference keeps its source id, which may already resolve on the target.
		if (key === 'workflowId' && typeof entry === 'string') {
			rebound[key] = bindings.workflows.get(entry) ?? entry;
			continue;
		}

		rebound[key] = rebindValue(entry, bindings);
	}

	return rebound;
}

/**
 * Rewrites a package agent config's external references for the target instance:
 * workflow tool ids map through the import's workflow bindings, credential ids map
 * through the credential bindings, and credential ids with no binding are blanked
 * so the imported agent starts unbound instead of pointing at a foreign id.
 */
export function rebindAgentConfig(
	config: AgentJsonConfig,
	bindings: PackageImportBindings,
): AgentJsonConfig {
	return AgentJsonConfigSchema.parse(rebindValue(config, bindings));
}
