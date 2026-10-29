import type { AgentSkill } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { createHash } from 'node:crypto';

function canonicalizeJson(value: unknown): unknown {
	if (Array.isArray(value)) return value.map((item) => canonicalizeJson(item));
	if (!isRecord(value)) return value;

	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(value).sort()) sorted[key] = canonicalizeJson(value[key]);
	return sorted;
}

/**
 * The `skillHash` that APIs return with a skill. An editor sends it back as
 * `baseSkillHash`, and a save from a stale copy is refused.
 */
export function getSkillHash(skill: AgentSkill): string {
	return createHash('sha256')
		.update(JSON.stringify(canonicalizeJson(skill)))
		.digest('hex');
}
