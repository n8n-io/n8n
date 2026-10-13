import type { ResultCardData, ResultCardTone } from './ResultCard.types';

/**
 * The accent palette. v3 cards are white surfaces; a tone colours the marks on
 * them (chart bars, the status dot, key dots, the date tile ink) so a service
 * or an agent keeps a recognisable hue without tinting the whole card.
 */
export interface ToneDefinition {
	id: ResultCardTone;
	/** solid mark colour */
	accent: string;
	/** the same hue as a soft fill (chips, tile backgrounds) */
	soft: string;
	/** ink that reads on `soft` */
	ink: string;
}

export const RESULT_CARD_TONES: Record<ResultCardTone, ToneDefinition> = {
	terracotta: {
		id: 'terracotta',
		accent: 'oklch(60% 0.16 36)',
		soft: 'oklch(95% 0.03 40)',
		ink: 'oklch(42% 0.14 33)',
	},
	aubergine: {
		id: 'aubergine',
		accent: 'oklch(45% 0.15 325)',
		soft: 'oklch(95% 0.03 325)',
		ink: 'oklch(35% 0.12 322)',
	},
	forest: {
		id: 'forest',
		accent: 'oklch(52% 0.12 150)',
		soft: 'oklch(95% 0.035 150)',
		ink: 'oklch(36% 0.09 152)',
	},
	sky: {
		id: 'sky',
		accent: 'oklch(58% 0.17 255)',
		soft: 'oklch(95% 0.03 250)',
		ink: 'oklch(42% 0.15 262)',
	},
	graphite: {
		id: 'graphite',
		accent: 'oklch(35% 0.012 260)',
		soft: 'oklch(95% 0.004 260)',
		ink: 'oklch(30% 0.012 260)',
	},
	lavender: {
		id: 'lavender',
		accent: 'oklch(56% 0.17 285)',
		soft: 'oklch(95.5% 0.025 285)',
		ink: 'oklch(42% 0.15 280)',
	},
	mint: {
		id: 'mint',
		accent: 'oklch(55% 0.13 160)',
		soft: 'oklch(95% 0.035 160)',
		ink: 'oklch(40% 0.11 158)',
	},
	paper: {
		id: 'paper',
		accent: 'oklch(58% 0.19 10)',
		soft: 'oklch(96% 0.02 60)',
		ink: 'oklch(45% 0.16 12)',
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
	event: 'paper',
	ticket: 'graphite',
	chart: 'sky',
	pulse: 'paper',
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

/** Series colours for charts without explicit ones (transitions.dev token-spend palette first). */
export const CHART_SERIES_COLORS = [
	'#1C5FFB',
	'#B01CFB',
	'#EF8121',
	'#1EBB26',
	'#E23B6E',
	'#0FA3B1',
] as const;
