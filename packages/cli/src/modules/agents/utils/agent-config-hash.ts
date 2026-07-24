import type { AgentJsonConfig } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { createHash } from 'node:crypto';

function canonicalizeJson(value: unknown): unknown {
	if (Array.isArray(value)) return value.map((item) => canonicalizeJson(item));
	if (!isRecord(value)) return value;

	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(value).sort()) sorted[key] = canonicalizeJson(value[key]);
	return sorted;
}

export function getAgentConfigHash(config: AgentJsonConfig | null): string | null {
	if (!config) return null;
	return createHash('sha256')
		.update(JSON.stringify(canonicalizeJson(config)))
		.digest('hex');
}
