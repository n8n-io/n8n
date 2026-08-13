import type { ExportedAgentJsonConfig } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { createHash } from 'node:crypto';

import { withBareConfigRefs } from '../json-config/bare-config-refs';

function canonicalizeJson(value: unknown): unknown {
	if (Array.isArray(value)) return value.map((item) => canonicalizeJson(item));
	if (!isRecord(value)) return value;

	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(value).sort()) sorted[key] = canonicalizeJson(value[key]);
	return sorted;
}

// Accepts the exported shape (a superset of the persisted shape), so both
// bare persisted configs and hydrated export/response configs hash cleanly.
export function getAgentConfigHash(config: ExportedAgentJsonConfig | null): string | null {
	if (!config) return null;

	// Hash the bare-ref shape so the result is identical whether the config
	// came straight off the schema column or had task/skill/custom-tool
	// definition bodies inlined for export.
	return createHash('sha256')
		.update(JSON.stringify(canonicalizeJson(withBareConfigRefs(config))))
		.digest('hex');
}
