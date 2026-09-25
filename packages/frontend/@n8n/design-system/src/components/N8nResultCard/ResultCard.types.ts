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

export type ResultCardData =
	| EmailCardData
	| MessageCardData
	| RecordsCardData
	| MetricCardData
	| ListCardData
	| KeyValueCardData;

export type ResultCardSkinId = 'gmail' | 'slack' | 'telegram' | 'googleSheets' | 'neutral';
/** The service's visual grammar the body borrows. Bodies must render with any grammar. */
export type ResultCardGrammar = 'inboxRow' | 'bubbleLeft' | 'bubbleRight' | 'grid' | 'none';

export interface ResultCardSkin {
	id: ResultCardSkinId;
	/** CSS colour used only for the accent bar, the icon tile and small marks — never for text */
	accent: string;
	grammar: ResultCardGrammar;
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
	skin?: ResultCardSkin;
	icon?: ResultCardIcon;
	footer?: ResultCardFooter;
	/** Show the Details expander (default true) */
	expandable?: boolean;
	/** Show "Open execution" inside Details and emit `openExecution` (default false) */
	executionLink?: boolean;
}
