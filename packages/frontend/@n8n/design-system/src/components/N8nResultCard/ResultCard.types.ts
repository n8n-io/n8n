export type ResultCardStatus = 'success' | 'error' | 'pending' | 'info';
export type ResultCardSource = 'mapped' | 'declared' | 'jev';

export interface ResultCardAction {
	label: string;
	href: string;
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
}

export interface EmailCardData extends ResultCardBase {
	type: 'email';
	direction: 'sent' | 'received';
	to: string[];
	cc?: string[];
	from?: string;
	subject: string;
	preview?: string;
	attachments?: string[];
	labels?: string[];
}

export interface MessageCardData extends ResultCardBase {
	type: 'message';
	channel: 'slack' | 'telegram' | 'discord' | 'whatsapp' | 'teams' | 'sms' | 'chat' | 'other';
	to: string;
	text: string;
	author?: string;
	isReply?: boolean;
}

export interface RecordsCardData extends ResultCardBase {
	type: 'records';
	target: string;
	operation: 'append' | 'update' | 'upsert' | 'read' | 'delete';
	columns: string[];
	rows: string[][];
	total: number;
}

export interface MetricCardData extends ResultCardBase {
	type: 'metric';
	value: string;
	unit?: string;
	label: string;
	delta?: { value: string; direction: 'up' | 'down' | 'flat'; label?: string };
	breakdown?: Array<{ label: string; value: number; share?: number }>;
	trend?: number[];
}

export interface ListCardData extends ResultCardBase {
	type: 'list';
	items: Array<{ title: string; subtitle?: string; meta?: string; href?: string }>;
	total?: number;
}

export interface KeyValueCardData extends ResultCardBase {
	type: 'keyValue';
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

export interface WeatherCardData extends ResultCardBase {
	type: 'weather';
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

export type ResultCardData =
	| EmailCardData
	| MessageCardData
	| RecordsCardData
	| MetricCardData
	| ListCardData
	| KeyValueCardData
	| WeatherCardData;

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
	/** Show the Details expander (default true) */
	expandable?: boolean;
	/** Show "Open execution" inside Details and emit `openExecution` (default false) */
	executionLink?: boolean;
	/** Entrance choreography (default true). Off for tests and static previews. */
	animated?: boolean;
}
