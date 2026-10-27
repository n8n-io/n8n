import type { PromotionDirection } from '@n8n/api-types';
import { promotionGitApplySettingsSchema, promotionGitPromoteSettingsSchema } from '@n8n/api-types';

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
	if (row.direction === 'apply') {
		const parsed = promotionGitApplySettingsSchema.safeParse(row.settings);
		return parsed.success ? { direction: 'apply', settings: parsed.data } : null;
	}
	const parsed = promotionGitPromoteSettingsSchema.safeParse(row.settings);
	return parsed.success ? { direction: 'promote', settings: parsed.data } : null;
}
