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

// The parameter type is the exported shape, a superset of the persisted
// shape. Thus the function accepts bare persisted configs and exported
// configs with inline definition bodies.
export function getAgentConfigHash(config: ExportedAgentJsonConfig | null): string | null {
	if (!config) return null;

	// Hash the bare-ref shape. Then a config from the schema column and the
	// same config with inline definition bodies get the same hash.
	return createHash('sha256')
		.update(JSON.stringify(canonicalizeJson(withBareConfigRefs(config))))
		.digest('hex');
}
