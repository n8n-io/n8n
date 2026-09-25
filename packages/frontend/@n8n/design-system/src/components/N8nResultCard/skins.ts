import type { ResultCardSkin, ResultCardSkinId } from './ResultCard.types';

/**
 * Accents are `light-dark()` pairs (brand colour for light surfaces, a lighter tint for dark
 * ones) so the accent bar, icon tile and small marks stay visible in both themes. The string
 * is applied as the inline `--result-card--accent` custom property; the root sets
 * `color-scheme: light dark`, so `light-dark()` resolves per theme and
 * `color-mix(in srgb, var(--result-card--accent) 14%, transparent)` keeps working.
 */
export const RESULT_CARD_SKINS: Record<ResultCardSkinId, ResultCardSkin> = {
	gmail: { id: 'gmail', accent: 'light-dark(#d93025, #f28b82)', grammar: 'inboxRow' },
	slack: { id: 'slack', accent: 'light-dark(#611f69, #d8a5e0)', grammar: 'bubbleLeft' },
	telegram: { id: 'telegram', accent: 'light-dark(#2aabee, #6cc3f5)', grammar: 'bubbleRight' },
	googleSheets: { id: 'googleSheets', accent: 'light-dark(#188038, #6cc17e)', grammar: 'grid' },
	neutral: { id: 'neutral', accent: 'var(--color--primary)', grammar: 'none' },
};

/** Base node type (without the `Tool` / `Trigger` suffix) → skin */
const NODE_TYPE_SKINS: Record<string, ResultCardSkinId> = {
	'n8n-nodes-base.gmail': 'gmail',
	'n8n-nodes-base.slack': 'slack',
	'n8n-nodes-base.telegram': 'telegram',
	'n8n-nodes-base.googleSheets': 'googleSheets',
};

export function resolveResultCardSkin(nodeType?: string): ResultCardSkin {
	if (!nodeType) return RESULT_CARD_SKINS.neutral;
	const base = nodeType.replace(/(Tool|Trigger)$/, '');
	return RESULT_CARD_SKINS[NODE_TYPE_SKINS[base] ?? 'neutral'];
}
