import { z } from 'zod';

/**
 * Result cards: a finite catalog of glanceable, interactive cards that show
 * what a workflow run produced. This schema is the wire format for every
 * source (mapped, declared by a workflow, chosen by Jev, authored by an agent).
 * Everything is plain text; the renderer never interprets markdown or HTML
 * from a card, never loads an arbitrary URL and never executes anything.
 *
 * v3 (Oct 2026): cards are white surfaces with a standard bottom bar. Two
 * envelope fields make them interactive without any code in the card:
 *
 * - `switcher` + `variants` — a control (tabs, segmented, menu, switch) that
 *   picks a named variant; each variant is a partial of the body that is merged
 *   over the card, and the renderer animates the change (digits pop, labels
 *   morph, charts re-flow, the weather sky cross-fades).
 * - `actions` — up to two pills at the bottom: a link, a visual toggle
 *   ("Decline" → "Declined") or an event the host handles ("Check in" →
 *   "Checking in" → "Checked in").
 */

const text = (max: number) => z.string().min(1).max(max);
const optionalText = (max: number) => z.string().max(max).optional();
const httpsUrl = z
	.string()
	.max(2048)
	.refine((value) => value.startsWith('https://'), { message: 'Only https:// links are allowed' });

export const resultCardArchetypes = [
	'email',
	'message',
	'records',
	'metric',
	'list',
	'keyValue',
	'weather',
	'event',
	'ticket',
	'chart',
	'pulse',
] as const;
export type ResultCardArchetype = (typeof resultCardArchetypes)[number];

export const resultCardStatusSchema = z.enum(['success', 'error', 'pending', 'info']);
export type ResultCardStatus = z.infer<typeof resultCardStatusSchema>;

export const resultCardSourceSchema = z.enum(['mapped', 'declared', 'jev']);
export type ResultCardSource = z.infer<typeof resultCardSourceSchema>;

/**
 * Accent palette. Cards are white; the tone colours the marks on them (chart
 * bars, status dot, key dots, the date tile) so a service or an agent can keep
 * a recognisable hue without tinting the whole surface.
 */
export const resultCardTones = [
	'terracotta',
	'aubergine',
	'forest',
	'sky',
	'lavender',
	'mint',
	'paper',
	'graphite',
] as const;
export type ResultCardTone = (typeof resultCardTones)[number];

/** Small glyph set an action pill may carry; the renderer maps each to an icon. */
export const resultCardActionIcons = [
	'video',
	'check',
	'external-link',
	'calendar',
	'map-pin',
	'send',
	'refresh',
	'play',
	'x',
	'arrow-right',
	'copy',
	'mail',
	'message',
	'bell',
	'star',
	'download',
	'plus',
] as const;
export type ResultCardActionIcon = (typeof resultCardActionIcons)[number];

/**
 * One pill in the bottom bar. `kind` defaults to `link` when `href` is given,
 * otherwise `event`. The first action renders as the primary (filled) pill.
 */
export const resultCardActionSchema = z.object({
	label: text(40),
	href: httpsUrl.optional(),
	kind: z.enum(['link', 'toggle', 'event']).optional(),
	/** Stable identifier the host receives for `toggle` and `event` actions ("decline", "check-in") */
	name: optionalText(40),
	icon: z.enum(resultCardActionIcons).optional(),
	/** `event`: label while the host handles it ("Checking in") */
	pendingLabel: optionalText(40),
	/** `toggle`: label once on ("Declined"); `event`: label once done ("Checked in") */
	doneLabel: optionalText(40),
	/** Colour the pill red once toggled on (a decline, a cancel) */
	destructive: z.boolean().optional(),
});
export type ResultCardAction = z.infer<typeof resultCardActionSchema>;

/**
 * The control that picks a variant. `tabs` is the bottom strip from the weather
 * card (icon + label per option); `segmented` the compact pill from the chart
 * header; `menu` a "…" dropdown; `switch` a two-option toggle row.
 */
export const resultCardSwitcherSchema = z.object({
	control: z.enum(['tabs', 'segmented', 'menu', 'switch']).default('tabs'),
	/** Where the control sits; `bottom` for tabs, `top` for segmented, by default */
	placement: z.enum(['top', 'bottom']).optional(),
	label: optionalText(40),
	options: z
		.array(
			z.object({
				key: text(24),
				label: text(16),
				/** Weather glyph or action icon name; unknown names render without an icon */
				icon: optionalText(24),
			}),
		)
		.min(2)
		.max(7),
	/** Key of the option selected on first render (defaults to the first) */
	default: optionalText(24),
});
export type ResultCardSwitcher = z.infer<typeof resultCardSwitcherSchema>;

const envelope = {
	title: text(80),
	eyebrow: optionalText(40),
	status: resultCardStatusSchema.optional(),
	/** Short word for the status pill ("Sent", "Added"). Falls back to a generic label. */
	statusLabel: optionalText(16),
	nodeType: optionalText(120),
	nodeName: optionalText(120),
	itemCount: z.number().int().nonnegative().optional(),
	source: resultCardSourceSchema.optional(),
	actions: z.array(resultCardActionSchema).max(2).optional(),
	tone: z.enum(resultCardTones).optional(),
	/** Optional cover photo (Unsplash only) rendered behind a gradient shade */
	cover: z
		.object({
			src: z
				.string()
				.max(2048)
				.refine((value) => value.startsWith('https://images.unsplash.com/'), {
					message: 'Cover images must come from images.unsplash.com',
				}),
			alt: optionalText(120),
		})
		.optional(),
	/** Node types involved in producing this outcome, in run order (trigger … side effect); the renderer shows their icons */
	nodeTypes: z.array(text(120)).max(4).optional(),
	switcher: resultCardSwitcherSchema.optional(),
};

/** Envelope fields a variant may override alongside its body fields. */
const variantEnvelope = {
	eyebrow: optionalText(40),
	status: resultCardStatusSchema.optional(),
	statusLabel: optionalText(16),
};

/** `variants: { [key]: Partial<body> }` for an archetype body. */
const variantsOf = <T extends z.ZodRawShape>(body: z.ZodObject<T>) =>
	z
		.record(text(24), z.object({ ...variantEnvelope, ...body.partial().shape }))
		.optional();

const archetype = <L extends string, T extends z.ZodRawShape>(type: L, body: z.ZodObject<T>) =>
	z.object({ type: z.literal(type), ...envelope, ...body.shape, variants: variantsOf(body) });

/* ------------------------------------------------------------------ bodies */

const emailBody = z.object({
	direction: z.enum(['sent', 'received']),
	to: z.array(text(120)).max(5),
	cc: z.array(text(120)).max(5).optional(),
	from: optionalText(120),
	subject: text(200),
	preview: optionalText(240),
	attachments: z.array(text(120)).max(5).optional(),
	labels: z.array(text(40)).max(5).optional(),
});

const messageBody = z.object({
	channel: z.enum(['slack', 'telegram', 'discord', 'whatsapp', 'teams', 'sms', 'chat', 'other']),
	to: text(120),
	text: text(400),
	author: optionalText(120),
	isReply: z.boolean().optional(),
});

const recordsBody = z.object({
	target: text(120),
	operation: z.enum(['append', 'update', 'upsert', 'read', 'delete']),
	columns: z.array(text(60)).min(1).max(4),
	rows: z.array(z.array(z.string().max(120)).max(4)).max(5),
	total: z.number().int().nonnegative(),
});

const metricBody = z.object({
	value: text(24),
	unit: optionalText(16),
	label: text(60),
	delta: z
		.object({
			value: text(24),
			direction: z.enum(['up', 'down', 'flat']),
			label: optionalText(40),
		})
		.optional(),
	breakdown: z
		.array(
			z.object({ label: text(60), value: z.number(), share: z.number().min(0).max(1).optional() }),
		)
		.max(5)
		.optional(),
	trend: z.array(z.number()).max(30).optional(),
});

const listBody = z.object({
	items: z
		.array(
			z.object({
				title: text(120),
				subtitle: optionalText(160),
				meta: optionalText(40),
				href: httpsUrl.optional(),
			}),
		)
		.min(1)
		.max(5),
	total: z.number().int().nonnegative().optional(),
});

const keyValueBody = z.object({
	pairs: z
		.array(z.object({ key: text(60), value: z.string().max(200) }))
		.min(1)
		.max(6),
});

/** Finite glyph set for conditions; the renderer maps each to an icon and a sky. */
export const weatherConditionIcons = [
	'sun',
	'partly-cloudy',
	'cloud',
	'fog',
	'drizzle',
	'rain',
	'snow',
	'thunder',
	'wind',
] as const;
export type WeatherConditionIcon = (typeof weatherConditionIcons)[number];

const weatherTemperature = z.number().min(-100).max(100);

/**
 * Current conditions for one place, composed by a workflow from one or more
 * forecast services. `temperature` is the headline (already in `unit`);
 * `sources` carries what each service said so the card can show agreement.
 * Day tabs: a `switcher` whose options are days and `variants` with each
 * day's `temperature`, `condition`, `icon`, `high`, `low` (and `eyebrow`).
 */
const weatherBody = z.object({
	location: text(80),
	temperature: weatherTemperature,
	unit: z.enum(['C', 'F']).default('C'),
	condition: text(40),
	icon: z.enum(weatherConditionIcons),
	feelsLike: weatherTemperature.optional(),
	humidity: z.number().min(0).max(100).optional(),
	wind: z
		.object({
			speed: z.number().min(0).max(500),
			unit: z.enum(['km/h', 'mph', 'm/s']),
			direction: optionalText(4),
		})
		.optional(),
	high: weatherTemperature.optional(),
	low: weatherTemperature.optional(),
	sources: z
		.array(
			z.object({ name: text(40), temperature: weatherTemperature, condition: optionalText(40) }),
		)
		.min(1)
		.max(5),
	forecast: z
		.array(
			z.object({
				label: text(12),
				high: weatherTemperature,
				low: weatherTemperature,
				icon: z.enum(weatherConditionIcons),
			}),
		)
		.max(5)
		.optional(),
});

export const eventAttendeeStatuses = ['going', 'maybe', 'declined', 'invited'] as const;

/**
 * A calendar event: a date tile, when and where, the people, and Join /
 * Decline. `startsAt`/`endsAt` are ISO timestamps the renderer formats in the
 * viewer's locale; `when` overrides the formatted line when the workflow
 * prefers its own wording.
 */
const eventBody = z.object({
	startsAt: z.string().datetime({ offset: true }).optional(),
	endsAt: z.string().datetime({ offset: true }).optional(),
	when: optionalText(60),
	platform: optionalText(40),
	location: optionalText(120),
	locationHref: httpsUrl.optional(),
	joinHref: httpsUrl.optional(),
	description: optionalText(240),
	attendees: z
		.array(
			z.object({
				name: text(60),
				email: optionalText(120),
				status: z.enum(eventAttendeeStatuses).optional(),
			}),
		)
		.max(8)
		.optional(),
	attendeeCount: z.number().int().nonnegative().optional(),
	/** Faded map behind the date tile (default: shown when there is a location) */
	map: z.boolean().optional(),
});

export const ticketModes = ['flight', 'train', 'bus', 'ferry', 'ride', 'other'] as const;
export const ticketBadgeTones = ['ok', 'warn', 'error', 'info'] as const;

const ticketEnd = z.object({ code: text(6), name: text(60), time: optionalText(12) });

/**
 * A pass or booking from A to B: two big codes, times, a perforated fact row
 * and the holder. Variants typically flip a status badge and the times.
 */
const ticketBody = z.object({
	reference: text(40),
	mode: z.enum(ticketModes).default('flight'),
	from: ticketEnd,
	to: ticketEnd,
	duration: optionalText(16),
	badge: z.object({ label: text(16), tone: z.enum(ticketBadgeTones).default('ok') }).optional(),
	facts: z.array(z.object({ label: text(16), value: text(24) })).max(4).optional(),
	holder: z
		.object({ name: text(60), detail: optionalText(40), initials: optionalText(3) })
		.optional(),
});

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Series colours are #rrggbb');

/**
 * A stacked (or grouped) bar chart: one column per slice, one value per
 * series in each column. Variants switch periods; the bars re-flow.
 */
const chartBody = z.object({
	kind: z.enum(['stacked', 'bars']).default('stacked'),
	total: optionalText(24),
	totalLabel: optionalText(24),
	range: optionalText(40),
	series: z.array(z.object({ name: text(40), color: hexColor.optional() })).min(1).max(6),
	columns: z
		.array(z.object({ label: text(12), values: z.array(z.number().min(0)).min(1).max(6) }))
		.min(1)
		.max(12),
	/** Rows for the "Details" expander under the legend */
	facts: z.array(z.object({ label: text(40), value: text(40) })).max(4).optional(),
});

/**
 * A live reading with a trace: a big number, its unit and a sweeping line.
 * `trace` is a series of samples the renderer draws as the moving line; when
 * absent a heartbeat-shaped path is used.
 */
const pulseBody = z.object({
	value: z.number(),
	unit: text(12),
	label: optionalText(40),
	trace: z.array(z.number()).max(120).optional(),
	live: z.boolean().optional(),
	/** Sweep period in seconds (defaults to 2.4) */
	period: z.number().min(0.4).max(30).optional(),
	section: optionalText(40),
	stats: z
		.array(z.object({ label: text(16), value: text(16), unit: optionalText(12) }))
		.max(3)
		.optional(),
});

/* -------------------------------------------------------------- archetypes */

export const emailCardSchema = archetype('email', emailBody);
export const messageCardSchema = archetype('message', messageBody);
export const recordsCardSchema = archetype('records', recordsBody);
export const metricCardSchema = archetype('metric', metricBody);
export const listCardSchema = archetype('list', listBody);
export const keyValueCardSchema = archetype('keyValue', keyValueBody);
export const weatherCardSchema = archetype('weather', weatherBody);
export const eventCardSchema = archetype('event', eventBody);
export const ticketCardSchema = archetype('ticket', ticketBody);
export const chartCardSchema = archetype('chart', chartBody);
export const pulseCardSchema = archetype('pulse', pulseBody);

export const resultCardSchema = z.discriminatedUnion('type', [
	emailCardSchema,
	messageCardSchema,
	recordsCardSchema,
	metricCardSchema,
	listCardSchema,
	keyValueCardSchema,
	weatherCardSchema,
	eventCardSchema,
	ticketCardSchema,
	chartCardSchema,
	pulseCardSchema,
]);

export type ResultCard = z.infer<typeof resultCardSchema>;
export type EmailCard = z.infer<typeof emailCardSchema>;
export type MessageCard = z.infer<typeof messageCardSchema>;
export type RecordsCard = z.infer<typeof recordsCardSchema>;
export type MetricCard = z.infer<typeof metricCardSchema>;
export type ListCard = z.infer<typeof listCardSchema>;
export type KeyValueCard = z.infer<typeof keyValueCardSchema>;
export type WeatherCard = z.infer<typeof weatherCardSchema>;
export type EventCard = z.infer<typeof eventCardSchema>;
export type TicketCard = z.infer<typeof ticketCardSchema>;
export type ChartCard = z.infer<typeof chartCardSchema>;
export type PulseCard = z.infer<typeof pulseCardSchema>;

export const MAX_RESULT_CARDS_PER_MESSAGE = 3;

/**
 * Whole-message form a workflow can return from its last node or a
 * Respond to Chat node: `{ "type": "cards", "text": "…", "cards": [ … ] }`.
 * A single `{ "type": "email", … }` card is also accepted (see the parser).
 */
export const chatHubMessageCardsSchema = z.object({
	type: z.literal('cards'),
	text: z.string().max(4000).optional(),
	cards: z.array(resultCardSchema).min(1).max(MAX_RESULT_CARDS_PER_MESSAGE),
});
export type ChatHubMessageCards = z.infer<typeof chatHubMessageCardsSchema>;
