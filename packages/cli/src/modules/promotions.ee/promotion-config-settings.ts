import type { PromotionDirection } from '@n8n/api-types';
import { promotionGitApplySettingsSchema, promotionGitPromoteSettingsSchema } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type { ResolvedPromotionConfig } from './promotions.types';

/**
 * Reads a stored row as a direction plus settings that belong to it. Returns null
 * when the settings do not match the schema for that direction, for example an
 * unknown `schemaVersion`. A column type says what we write, not what a row holds.
 */
export function resolveStoredConfig(row: {
	direction: PromotionDirection;
	settings: unknown;
}): ResolvedPromotionConfig | null {
	const settings = withoutRemovedFields(row.settings);
	if (row.direction === 'apply') {
		const parsed = promotionGitApplySettingsSchema.safeParse(settings);
		return parsed.success ? { direction: 'apply', settings: parsed.data } : null;
	}
	const parsed = promotionGitPromoteSettingsSchema.safeParse(settings);
	return parsed.success ? { direction: 'promote', settings: parsed.data } : null;
}

/**
 * An earlier version stored `allowIncomplete`. The schemas are strict, so a row that still
 * holds the field would not load. The next save of the environment writes the row without it.
 */
function withoutRemovedFields(settings: unknown): unknown {
	if (!isRecord(settings) || !('allowIncomplete' in settings)) return settings;
	const { allowIncomplete: _removed, ...rest } = settings;
	return rest;
}
