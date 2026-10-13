/*
	Mirror of `@n8n/api-types` `chat-hub-result-card.ts` (the design system does
	not depend on api-types). Keep the two in step.
*/

export type ResultCardStatus = 'success' | 'error' | 'pending' | 'info';
export type ResultCardSource = 'mapped' | 'declared' | 'jev';

export type ResultCardActionIcon =
	| 'video'
	| 'check'
	| 'external-link'
	| 'calendar'
	| 'map-pin'
	| 'send'
	| 'refresh'
	| 'play'
	| 'x'
	| 'arrow-right'
	| 'copy'
	| 'mail'
	| 'message'
	| 'bell'
	| 'star'
	| 'download'
	| 'plus';

export interface ResultCardAction {
	label: string;
	href?: string;
	/** defaults to `link` with an href, `event` otherwise */
	kind?: 'link' | 'toggle' | 'event';
	name?: string;
	/** one of `ResultCardActionIcon`; unknown names fall back to a generic glyph */
	icon?: ResultCardActionIcon | (string & {});
	pendingLabel?: string;
	doneLabel?: string;
	destructive?: boolean;
}

export type ResultCardSwitcherControl = 'tabs' | 'segmented' | 'menu' | 'switch';

export interface ResultCardSwitcherOption {
	key: string;
	label: string;
	icon?: string;
}

export interface ResultCardSwitcher {
	control?: ResultCardSwitcherControl;
	placement?: 'top' | 'bottom';
	label?: string;
	options: ResultCardSwitcherOption[];
	default?: string;
}

export type ResultCardTone =
	| 'terracotta'
	| 'aubergine'
	| 'forest'
	| 'sky'
	| 'lavender'
	| 'mint'
	| 'paper'
	| 'graphite';

export interface ResultCardCover {
	src: string;
	alt?: string;
}

interface ResultCardBase {
	title: string;
	eyebrow?: string;
	status?: ResultCardStatus;
	statusLabel?: string;
	nodeType?: string;
	nodeName?: string;
	itemCount?: number;
	source?: ResultCardSource;
	actions?: ResultCardAction[];
	tone?: ResultCardTone;
	cover?: ResultCardCover;
	nodeTypes?: string[];
	switcher?: ResultCardSwitcher;
}

/** Envelope fields a variant may override alongside its body fields. */
type VariantEnvelope = Pick<ResultCardBase, 'eyebrow' | 'status' | 'statusLabel'>;

/** `variants: { [key]: Partial<body> }` — merged over the card when the switcher picks `key`. */
type WithVariants<Body> = Body & { variants?: Record<string, Partial<Body> & VariantEnvelope> };

/* ------------------------------------------------------------------ bodies */

export interface EmailBody {
	direction: 'sent' | 'received';
	to: string[];
	cc?: string[];
	from?: string;
	subject: string;
	preview?: string;
	attachments?: string[];
	labels?: string[];
}

export interface MessageBody {
	channel: 'slack' | 'telegram' | 'discord' | 'whatsapp' | 'teams' | 'sms' | 'chat' | 'other';
	to: string;
	text: string;
	author?: string;
	isReply?: boolean;
}

export interface RecordsBody {
	target: string;
	operation: 'append' | 'update' | 'upsert' | 'read' | 'delete';
	columns: string[];
	rows: string[][];
	total: number;
}

export interface MetricBody {
	value: string;
	unit?: string;
	label: string;
	delta?: { value: string; direction: 'up' | 'down' | 'flat'; label?: string };
	breakdown?: Array<{ label: string; value: number; share?: number }>;
	trend?: number[];
}

export interface ListBody {
	items: Array<{ title: string; subtitle?: string; meta?: string; href?: string }>;
	total?: number;
}

export interface KeyValueBody {
	pairs: Array<{ key: string; value: string }>;
}

export type WeatherConditionIcon =
	| 'sun'
	| 'partly-cloudy'
	| 'cloud'
	| 'fog'
	| 'drizzle'
	| 'rain'
	| 'snow'
	| 'thunder'
	| 'wind';

export interface WeatherBody {
	location: string;
	temperature: number;
	unit: 'C' | 'F';
	condition: string;
	icon: WeatherConditionIcon;
	feelsLike?: number;
	humidity?: number;
	wind?: { speed: number; unit: 'km/h' | 'mph' | 'm/s'; direction?: string };
	high?: number;
	low?: number;
	sources?: Array<{ name: string; temperature: number; condition?: string }>;
	forecast?: Array<{ label: string; high: number; low: number; icon: WeatherConditionIcon }>;
}

export type EventAttendeeStatus = 'going' | 'maybe' | 'declined' | 'invited';

export interface EventBody {
	startsAt?: string;
	endsAt?: string;
	when?: string;
	platform?: string;
	location?: string;
	locationHref?: string;
	joinHref?: string;
	description?: string;
	attendees?: Array<{ name: string; email?: string; status?: EventAttendeeStatus }>;
	attendeeCount?: number;
	map?: boolean;
}

export type TicketMode = 'flight' | 'train' | 'bus' | 'ferry' | 'ride' | 'other';
export type TicketBadgeTone = 'ok' | 'warn' | 'error' | 'info';

export interface TicketEnd {
	code: string;
	name: string;
	time?: string;
}

export interface TicketBody {
	reference: string;
	mode?: TicketMode;
	from: TicketEnd;
	to: TicketEnd;
	duration?: string;
	badge?: { label: string; tone?: TicketBadgeTone };
	facts?: Array<{ label: string; value: string }>;
	holder?: { name: string; detail?: string; initials?: string };
}

export interface ChartBody {
	kind?: 'stacked' | 'bars';
	total?: string;
	totalLabel?: string;
	range?: string;
	series: Array<{ name: string; color?: string }>;
	columns: Array<{ label: string; values: number[] }>;
	facts?: Array<{ label: string; value: string }>;
}

export interface PulseBody {
	value: number;
	unit: string;
	label?: string;
	trace?: number[];
	live?: boolean;
	period?: number;
	section?: string;
	stats?: Array<{ label: string; value: string; unit?: string }>;
}

/* -------------------------------------------------------------- archetypes */

export type EmailCardData = ResultCardBase & { type: 'email' } & WithVariants<EmailBody>;
export type MessageCardData = ResultCardBase & { type: 'message' } & WithVariants<MessageBody>;
export type RecordsCardData = ResultCardBase & { type: 'records' } & WithVariants<RecordsBody>;
export type MetricCardData = ResultCardBase & { type: 'metric' } & WithVariants<MetricBody>;
export type ListCardData = ResultCardBase & { type: 'list' } & WithVariants<ListBody>;
export type KeyValueCardData = ResultCardBase & { type: 'keyValue' } & WithVariants<KeyValueBody>;
export type WeatherCardData = ResultCardBase & { type: 'weather' } & WithVariants<WeatherBody>;
export type EventCardData = ResultCardBase & { type: 'event' } & WithVariants<EventBody>;
export type TicketCardData = ResultCardBase & { type: 'ticket' } & WithVariants<TicketBody>;
export type ChartCardData = ResultCardBase & { type: 'chart' } & WithVariants<ChartBody>;
export type PulseCardData = ResultCardBase & { type: 'pulse' } & WithVariants<PulseBody>;

export type ResultCardData =
	| EmailCardData
	| MessageCardData
	| RecordsCardData
	| MetricCardData
	| ListCardData
	| KeyValueCardData
	| WeatherCardData
	| EventCardData
	| TicketCardData
	| ChartCardData
	| PulseCardData;

export type ResultCardArchetype = ResultCardData['type'];

/* ------------------------------------------------------------------- props */

export interface ResultCardIcon {
	type: 'file' | 'icon' | 'unknown';
	src?: string;
	name?: string;
	color?: string;
}

export interface ResultCardFooter {
	workflowName?: string;
	time?: string;
}

export interface ResultCardProps {
	card: ResultCardData;
	/** Node icons shown as an overlapping cluster bottom-left, in run order (≤ 4) */
	icons?: ResultCardIcon[];
	/** Back-compat: a single icon, equivalent to `icons: [icon]` */
	icon?: ResultCardIcon;
	footer?: ResultCardFooter;
	/** Show the Details affordance that opens the data dialog (default true) */
	expandable?: boolean;
	/** Show "Open execution" inside Details and emit `openExecution` (default false) */
	executionLink?: boolean;
	/** Entrance choreography (default true). Off for tests and static previews. */
	animated?: boolean;
}

export type ResultCardActionState = 'idle' | 'pending' | 'done' | 'on';

export interface ResultCardActionEvent {
	action: ResultCardAction;
	index: number;
	state: ResultCardActionState;
}
