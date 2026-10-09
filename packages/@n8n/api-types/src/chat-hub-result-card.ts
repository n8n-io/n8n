import { z } from 'zod';

/**
 * Result cards: a finite catalog of glanceable cards that show what a workflow
 * run produced. This schema is the wire format for every source (mapped,
 * declared by a workflow, chosen by Jev). Everything is plain text; the
 * renderer never interprets markdown or HTML from a card.
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
] as const;
export type ResultCardArchetype = (typeof resultCardArchetypes)[number];

export const resultCardStatusSchema = z.enum(['success', 'error', 'pending', 'info']);
export type ResultCardStatus = z.infer<typeof resultCardStatusSchema>;

export const resultCardSourceSchema = z.enum(['mapped', 'declared', 'jev']);
export type ResultCardSource = z.infer<typeof resultCardSourceSchema>;

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
	actions: z
		.array(z.object({ label: text(40), href: httpsUrl }))
		.max(2)
		.optional(),
	/** Finite surface palette in the Daily Brief hue; the renderer picks a default per service/archetype when absent */
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
};

export const emailCardSchema = z.object({
	type: z.literal('email'),
	...envelope,
	direction: z.enum(['sent', 'received']),
	to: z.array(text(120)).max(5),
	cc: z.array(text(120)).max(5).optional(),
	from: optionalText(120),
	subject: text(200),
	preview: optionalText(240),
	attachments: z.array(text(120)).max(5).optional(),
	labels: z.array(text(40)).max(5).optional(),
});

export const messageCardSchema = z.object({
	type: z.literal('message'),
	...envelope,
	channel: z.enum(['slack', 'telegram', 'discord', 'whatsapp', 'teams', 'sms', 'chat', 'other']),
	to: text(120),
	text: text(400),
	author: optionalText(120),
	isReply: z.boolean().optional(),
});

export const recordsCardSchema = z.object({
	type: z.literal('records'),
	...envelope,
	target: text(120),
	operation: z.enum(['append', 'update', 'upsert', 'read', 'delete']),
	columns: z.array(text(60)).min(1).max(4),
	rows: z.array(z.array(z.string().max(120)).max(4)).max(5),
	total: z.number().int().nonnegative(),
});

export const metricCardSchema = z.object({
	type: z.literal('metric'),
	...envelope,
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

export const listCardSchema = z.object({
	type: z.literal('list'),
	...envelope,
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

export const keyValueCardSchema = z.object({
	type: z.literal('keyValue'),
	...envelope,
	pairs: z
		.array(z.object({ key: text(60), value: z.string().max(200) }))
		.min(1)
		.max(6),
});

/** Finite glyph set for conditions; the renderer maps each to an icon. */
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
 */
export const weatherCardSchema = z.object({
	type: z.literal('weather'),
	...envelope,
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

export const resultCardSchema = z.discriminatedUnion('type', [
	emailCardSchema,
	messageCardSchema,
	recordsCardSchema,
	metricCardSchema,
	listCardSchema,
	keyValueCardSchema,
	weatherCardSchema,
]);

export type ResultCard = z.infer<typeof resultCardSchema>;
export type EmailCard = z.infer<typeof emailCardSchema>;
export type MessageCard = z.infer<typeof messageCardSchema>;
export type RecordsCard = z.infer<typeof recordsCardSchema>;
export type MetricCard = z.infer<typeof metricCardSchema>;
export type ListCard = z.infer<typeof listCardSchema>;
export type KeyValueCard = z.infer<typeof keyValueCardSchema>;
export type WeatherCard = z.infer<typeof weatherCardSchema>;

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
