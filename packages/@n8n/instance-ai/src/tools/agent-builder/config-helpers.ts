/**
 * Instance-ai-specific config helpers: the freshness protocol (config hashing)
 * the LLM tools use to detect stale writes.
 *
 * The pure validation/normalization logic (`$fromAI` dynamic-selector
 * enforcement, empty-instructions, native-web-search) is shared with the CLI
 * agent builder and lives in `@n8n/ai-utilities/agent-config` so the two
 * surfaces can't drift apart.
 */
import type { AgentJsonConfig, ConfigValidationError } from '@n8n/api-types';
import { createHash } from 'node:crypto';

import type { AgentConfigSnapshot } from '../../types';

export const STALE_CONFIG_ERROR: ConfigValidationError = {
	path: '(root)',
	message:
		'Agent config changed since you last read it. Call read_config and retry with the returned configHash.',
};

function canonicalizeJson(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalizeJson);
	if (typeof value !== 'object' || value === null) return value;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(value as Record<string, unknown>).sort()) {
		sorted[key] = canonicalizeJson((value as Record<string, unknown>)[key]);
	}
	return sorted;
}

/** Stable SHA-256 of the canonicalized config — the `configHash` returned to the LLM. */
export function getAgentConfigHash(config: AgentJsonConfig | null): string | null {
	if (!config) return null;
	return createHash('sha256')
		.update(JSON.stringify(canonicalizeJson(config)))
		.digest('hex');
}

export interface HashedSnapshot extends AgentConfigSnapshot {
	configHash: string | null;
}

export function withConfigHash(snapshot: AgentConfigSnapshot): HashedSnapshot {
	return { ...snapshot, configHash: getAgentConfigHash(snapshot.config) };
}
