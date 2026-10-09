import type { ResultCardData, ResultCardTone } from './ResultCard.types';

/**
 * The surface palette. Dark tones carry white ink; light tones carry warm ink and switch to a
 * deep variant in dark mode. All values live in the Daily Brief hue family (warm paper, coral,
 * terracotta) — see context/visual-references/daily-brief-palette.css.
 */
export interface ToneDefinition {
	id: ResultCardTone;
	/** `dark` = white ink on a saturated surface, `light` = warm ink on a tinted paper */
	kind: 'dark' | 'light';
	surface: string;
	/** dark-mode surface for light tones */
	surfaceDark?: string;
	/** colour of bars / marks / checkboxes on light tones (dark tones use white) */
	accent?: string;
}

export const RESULT_CARD_TONES: Record<ResultCardTone, ToneDefinition> = {
	terracotta: {
		id: 'terracotta',
		kind: 'dark',
		surface: 'linear-gradient(170deg, oklch(57% 0.15 36) 0%, oklch(50% 0.14 33) 100%)',
	},
	aubergine: {
		id: 'aubergine',
		kind: 'dark',
		surface: 'linear-gradient(170deg, oklch(33% 0.11 325) 0%, oklch(25% 0.09 322) 100%)',
	},
	forest: {
		id: 'forest',
		kind: 'dark',
		surface:
			'linear-gradient(168deg, oklch(50% 0.1 145) 0%, oklch(33% 0.08 150) 58%, oklch(27% 0.07 152) 100%)',
	},
	sky: {
		id: 'sky',
		kind: 'dark',
		surface: 'linear-gradient(170deg, oklch(60% 0.13 243) 0%, oklch(44% 0.15 262) 100%)',
	},
	graphite: {
		id: 'graphite',
		kind: 'dark',
		surface: 'linear-gradient(170deg, oklch(30% 0.012 260) 0%, oklch(19% 0.012 260) 100%)',
	},
	lavender: {
		id: 'lavender',
		kind: 'light',
		surface: 'oklch(95.5% 0.02 285)',
		surfaceDark: 'oklch(30% 0.045 285)',
		accent: 'oklch(52% 0.16 280)',
	},
	mint: {
		id: 'mint',
		kind: 'light',
		surface: 'oklch(95% 0.03 150)',
		surfaceDark: 'oklch(28% 0.05 150)',
		accent: 'oklch(48% 0.12 152)',
	},
	paper: {
		id: 'paper',
		kind: 'light',
		surface: 'oklch(97.5% 0.012 80)',
		surfaceDark: 'oklch(27% 0.014 60)',
		accent: 'oklch(54% 0.185 8)',
	},
};

const SERVICE_TONES: Array<[RegExp, ResultCardTone]> = [
	[/\.(gmail|emailSend|microsoftOutlook)(Tool|Trigger)?$/, 'paper'],
	[/\.slack(Tool|Trigger)?$/, 'aubergine'],
	[/\.telegram(Tool|Trigger)?$/, 'sky'],
	[/\.(googleSheets|airtable|dataTable|postgres|mySql|supabase)(Tool|Trigger)?$/, 'forest'],
];

const ARCHETYPE_TONES: Record<ResultCardData['type'], ResultCardTone> = {
	metric: 'terracotta',
	records: 'forest',
	list: 'lavender',
	message: 'graphite',
	email: 'paper',
	keyValue: 'paper',
	weather: 'sky',
};

export function resolveResultCardTone(
	card: Pick<ResultCardData, 'type' | 'tone' | 'nodeType'>,
): ToneDefinition {
	if (card.tone && card.tone in RESULT_CARD_TONES) return RESULT_CARD_TONES[card.tone];
	const nodeType = card.nodeType;
	const service = nodeType ? SERVICE_TONES.find(([pattern]) => pattern.test(nodeType)) : undefined;
	return RESULT_CARD_TONES[service?.[1] ?? ARCHETYPE_TONES[card.type]];
}

/** Service the body grammar should imitate, derived from the node type */
export type ResultCardService = 'gmail' | 'slack' | 'telegram' | 'googleSheets' | 'generic';

export function resolveResultCardService(nodeType?: string): ResultCardService {
	if (!nodeType) return 'generic';
	if (/\.gmail/.test(nodeType)) return 'gmail';
	if (/\.slack/.test(nodeType)) return 'slack';
	if (/\.telegram/.test(nodeType)) return 'telegram';
	if (/\.googleSheets/.test(nodeType)) return 'googleSheets';
	return 'generic';
}
