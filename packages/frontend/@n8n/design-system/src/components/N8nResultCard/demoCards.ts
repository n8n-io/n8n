import type {
	ChartCardData,
	EmailCardData,
	EventCardData,
	KeyValueCardData,
	ListCardData,
	MessageCardData,
	MetricCardData,
	PulseCardData,
	RecordsCardData,
	TicketCardData,
	WeatherCardData,
} from './ResultCard.types';

export const DEMO_EMAIL: EmailCardData = {
	type: 'email',
	title: 'Reply sent to Anna Kowalski',
	eyebrow: 'Gmail · Email sent',
	status: 'success',
	statusLabel: 'Sent',
	nodeType: 'n8n-nodes-base.gmail',
	nodeName: 'Gmail',
	nodeTypes: [
		'@n8n/n8n-nodes-langchain.chatTrigger',
		'@n8n/n8n-nodes-langchain.informationExtractor',
		'n8n-nodes-base.gmail',
	],
	itemCount: 1,
	source: 'mapped',
	direction: 'sent',
	to: ['anna.kowalski@allegro.pl'],
	subject: 'Re: Invoice #1042',
	preview:
		'Hi Anna, the invoice is approved and has been forwarded to finance. You should see the payment within 14 days.',
	attachments: ['invoice-1042.pdf'],
	actions: [
		{ label: 'Open in Gmail', href: 'https://mail.google.com/', icon: 'external-link' },
		{ label: 'Snooze', kind: 'toggle', name: 'snooze', doneLabel: 'Snoozed', icon: 'bell' },
	],
};

export const DEMO_RECORDS: RecordsCardData = {
	type: 'records',
	title: '1 row added to Leads 2026',
	eyebrow: 'Google Sheets · Row added',
	status: 'success',
	statusLabel: 'Added',
	nodeType: 'n8n-nodes-base.googleSheets',
	nodeName: 'Google Sheets',
	nodeTypes: ['@n8n/n8n-nodes-langchain.chatTrigger', 'n8n-nodes-base.googleSheets'],
	itemCount: 1,
	source: 'jev',
	target: 'Leads 2026',
	operation: 'append',
	columns: ['Name', 'Company', 'Source', 'Status'],
	rows: [['Marta Nowak', 'Allegro', 'LinkedIn', 'New']],
	total: 1,
	actions: [
		{ label: 'Open sheet', href: 'https://docs.google.com/spreadsheets/', icon: 'external-link' },
	],
};

/** Five rows on the wire, three on the card → "+9 more" */
export const DEMO_RECORDS_MANY: RecordsCardData = {
	...DEMO_RECORDS,
	title: '12 rows added to Leads 2026',
	itemCount: 12,
	rows: [
		['Marta Nowak', 'Allegro', 'LinkedIn', 'New'],
		['Jonas Weber', 'Zalando', 'Referral', 'Contacted'],
		['Priya Raman', 'Wise', 'Website', 'New'],
		['Luca Bianchi', 'Satispay', 'LinkedIn', 'Qualified'],
		['Ana Costa', 'Farfetch', 'Event', 'New'],
	],
	total: 12,
};

/** Week / month variants: the number pops, the bars morph. */
export const DEMO_METRIC: MetricCardData = {
	type: 'metric',
	title: 'Leads this week',
	eyebrow: 'Weekly summary',
	status: 'info',
	nodeType: 'n8n-nodes-base.code',
	nodeName: 'Weekly summary',
	itemCount: 1,
	source: 'jev',
	value: '12',
	label: 'new leads since Monday',
	delta: { value: '+4', direction: 'up', label: 'vs last week' },
	breakdown: [
		{ label: 'LinkedIn', value: 7, share: 0.58 },
		{ label: 'Referral', value: 3, share: 0.25 },
		{ label: 'Website', value: 2, share: 0.17 },
	],
	switcher: {
		control: 'segmented',
		placement: 'top',
		options: [
			{ key: 'week', label: 'Week' },
			{ key: 'month', label: 'Month' },
		],
		default: 'week',
	},
	variants: {
		month: {
			value: '41',
			label: 'new leads in September',
			delta: { value: '-3', direction: 'down', label: 'vs August' },
			breakdown: [
				{ label: 'LinkedIn', value: 19 },
				{ label: 'Referral', value: 12 },
				{ label: 'Website', value: 10 },
			],
		},
	},
};

/** Trend only → sparkline on graphite */
export const DEMO_METRIC_TREND: MetricCardData = {
	type: 'metric',
	title: 'Slack status updates',
	eyebrow: 'Slack · Weekly summary',
	status: 'info',
	nodeType: 'n8n-nodes-base.slack',
	nodeName: 'Slack',
	itemCount: 1,
	source: 'jev',
	tone: 'graphite',
	value: '31',
	label: 'status changes this week',
	trend: [3, 5, 4, 8, 6, 9, 12, 7],
};

export const DEMO_SLACK: MessageCardData = {
	type: 'message',
	title: 'Posted to #marketing-feedback',
	eyebrow: 'Slack · Message posted',
	status: 'success',
	statusLabel: 'Posted',
	nodeType: 'n8n-nodes-base.slack',
	nodeName: 'Slack',
	itemCount: 1,
	source: 'mapped',
	channel: 'slack',
	to: '#marketing-feedback',
	author: 'n8n',
	text: 'The new hero video is doing the heavy lifting — campaign CTR nearly doubled this week.',
	actions: [
		{ label: 'Open thread', href: 'https://slack.com/', icon: 'message' },
		{ label: 'Pin', kind: 'toggle', name: 'pin', doneLabel: 'Pinned', icon: 'star' },
	],
};

export const DEMO_TELEGRAM: MessageCardData = {
	type: 'message',
	title: 'Sent to Jan',
	eyebrow: 'Telegram · Message sent',
	status: 'success',
	statusLabel: 'Sent',
	nodeType: 'n8n-nodes-base.telegram',
	nodeName: 'Telegram',
	itemCount: 1,
	source: 'mapped',
	channel: 'telegram',
	to: 'Jan',
	text: 'Sinner walks onto Centre Court in 20 minutes — semi-final vs Djokovic.',
};

export const DEMO_LIST: ListCardData = {
	type: 'list',
	title: '3 open pull requests need review',
	eyebrow: 'GitHub · Search',
	status: 'info',
	nodeType: 'n8n-nodes-base.github',
	nodeName: 'GitHub',
	itemCount: 3,
	source: 'jev',
	items: [
		{
			title: 'Rate limiter rollout',
			subtitle: 'infra · opened 2 days ago',
			meta: '#412',
			href: 'https://github.com/n8n-io/n8n/pull/412',
		},
		{ title: 'Webhook retry queue', subtitle: 'core · opened yesterday', meta: '#418' },
		{ title: 'Payments migration', subtitle: 'billing · opened today', meta: '#421' },
	],
	total: 3,
	actions: [{ label: 'Review now', href: 'https://github.com/n8n-io/n8n/pulls' }],
};

export const DEMO_KEY_VALUE: KeyValueCardData = {
	type: 'keyValue',
	title: 'Tennis ranking · Zofia',
	eyebrow: 'HTTP Request · Scrape',
	status: 'info',
	nodeType: 'n8n-nodes-base.httpRequest',
	nodeName: 'Fetch ranking',
	itemCount: 1,
	source: 'mapped',
	tone: 'forest',
	cover: {
		src: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=70',
		alt: 'Tennis court',
	},
	pairs: [
		{ key: 'Ranking', value: '#184' },
		{ key: 'Change', value: '+6 this week' },
		{ key: 'Points', value: '312' },
		{ key: 'Next tournament', value: 'Warsaw Open · 3 Oct' },
	],
};

export const DEMO_KEY_VALUE_PAPER: KeyValueCardData = {
	...DEMO_KEY_VALUE,
	cover: undefined,
	tone: 'paper',
};

/** transitions.dev "Weather Day Switcher": five days as a tab strip over a living sky. */
export const DEMO_WEATHER: WeatherCardData = {
	type: 'weather',
	title: 'San Francisco',
	eyebrow: 'Monday',
	status: 'info',
	nodeTypes: ['n8n-nodes-base.httpRequest', 'n8n-nodes-base.code'],
	nodeName: 'Compose weather card',
	itemCount: 1,
	source: 'declared',
	tone: 'sky',
	location: 'San Francisco',
	temperature: 24,
	unit: 'C',
	condition: 'Sunny',
	icon: 'sun',
	high: 26,
	low: 17,
	switcher: {
		control: 'tabs',
		label: 'Forecast days',
		options: [
			{ key: 'mon', label: 'Mon', icon: 'sun' },
			{ key: 'tue', label: 'Tue', icon: 'cloud' },
			{ key: 'wed', label: 'Wed', icon: 'rain' },
			{ key: 'thu', label: 'Thu', icon: 'thunder' },
			{ key: 'fri', label: 'Fri', icon: 'sun' },
		],
		default: 'mon',
	},
	variants: {
		tue: {
			eyebrow: 'Tuesday',
			icon: 'cloud',
			condition: 'Cloudy',
			temperature: 19,
			high: 21,
			low: 14,
		},
		wed: {
			eyebrow: 'Wednesday',
			icon: 'rain',
			condition: 'Light rain',
			temperature: 16,
			high: 18,
			low: 12,
		},
		thu: {
			eyebrow: 'Thursday',
			icon: 'thunder',
			condition: 'Thunderstorms',
			temperature: 15,
			high: 17,
			low: 11,
		},
		fri: { eyebrow: 'Friday', icon: 'sun', condition: 'Sunny', temperature: 22, high: 25, low: 15 },
	},
};

/** The Lisbon card from the mapped weather workflow: one day, three sources. */
export const DEMO_WEATHER_SOURCES: WeatherCardData = {
	type: 'weather',
	title: 'Lisbon, Portugal',
	eyebrow: 'Now · Fri 12:40',
	status: 'info',
	statusLabel: 'Live',
	nodeTypes: ['n8n-nodes-base.httpRequest', 'n8n-nodes-base.code'],
	nodeName: 'Compose weather card',
	itemCount: 1,
	source: 'declared',
	tone: 'sky',
	location: 'Lisbon, Portugal',
	temperature: 14,
	unit: 'C',
	condition: 'Light rain',
	icon: 'rain',
	feelsLike: 12,
	humidity: 78,
	wind: { speed: 21, unit: 'km/h', direction: 'W' },
	high: 16,
	low: 9,
	sources: [
		{ name: 'Open-Meteo', temperature: 14.2, condition: 'Light rain' },
		{ name: 'MET Norway', temperature: 13.6, condition: 'Rain' },
		{ name: 'wttr.in', temperature: 15, condition: 'Patchy rain' },
	],
};

/** transitions.dev "Event Card With Attendees". */
export const DEMO_EVENT: EventCardData = {
	type: 'event',
	title: 'Launch review',
	eyebrow: 'Google Calendar · Invite',
	status: 'info',
	nodeType: 'n8n-nodes-base.googleCalendar',
	nodeName: 'Google Calendar',
	itemCount: 1,
	source: 'mapped',
	startsAt: '2026-05-14T14:00:00',
	endsAt: '2026-05-14T15:00:00',
	platform: 'Google Meet',
	location: 'Studio 4, 210 Market St',
	locationHref: 'https://maps.google.com/?q=210+Market+St',
	joinHref: 'https://meet.google.com/abc-defg-hij',
	attendees: [
		{ name: 'Maya Chen', status: 'going' },
		{ name: 'Leo Park', status: 'going' },
		{ name: 'Ava Ruiz', status: 'going' },
		{ name: 'Noah Kim', status: 'going' },
		{ name: 'Iris Hale', status: 'going' },
	],
	attendeeCount: 5,
	actions: [
		{
			label: 'Join call',
			kind: 'event',
			name: 'join',
			icon: 'video',
			pendingLabel: 'Connecting…',
		},
		{ label: 'Decline', kind: 'toggle', name: 'decline', doneLabel: 'Declined', destructive: true },
	],
};

/** transitions.dev "Boarding Pass Check-in": the switch toggles the status; times pop. */
export const DEMO_TICKET: TicketCardData = {
	type: 'ticket',
	title: 'SFO → JFK',
	eyebrow: 'Flight status',
	status: 'success',
	nodeType: 'n8n-nodes-base.httpRequest',
	nodeName: 'Flight status',
	itemCount: 1,
	source: 'declared',
	reference: 'TA 482 · Wed, Jun 12',
	mode: 'flight',
	from: { code: 'SFO', name: 'San Francisco', time: '08:45' },
	to: { code: 'JFK', name: 'New York', time: '17:05' },
	duration: '5h 20m',
	badge: { label: 'On time', tone: 'ok' },
	facts: [
		{ label: 'Gate', value: 'B12' },
		{ label: 'Seat', value: '14A' },
		{ label: 'Boards', value: '08:05' },
		{ label: 'Zone', value: '2' },
	],
	holder: { name: 'Maya Chen', detail: 'Economy' },
	switcher: {
		control: 'switch',
		label: 'Schedule',
		options: [
			{ key: 'scheduled', label: 'Scheduled' },
			{ key: 'live', label: 'Live' },
		],
		default: 'scheduled',
	},
	variants: {
		live: {
			status: 'pending',
			badge: { label: 'Delayed', tone: 'warn' },
			from: { code: 'SFO', name: 'San Francisco', time: '09:25' },
			to: { code: 'JFK', name: 'New York', time: '17:45' },
			facts: [
				{ label: 'Gate', value: 'B12' },
				{ label: 'Seat', value: '14A' },
				{ label: 'Boards', value: '08:45' },
				{ label: 'Zone', value: '2' },
			],
		},
	},
	actions: [
		{
			label: 'Check in',
			kind: 'event',
			name: 'checkIn',
			pendingLabel: 'Checking in',
			doneLabel: 'Checked in',
			icon: 'check',
		},
	],
};

const CHART_SERIES = [
	{ name: 'Atlas Large' },
	{ name: 'Atlas Mini' },
	{ name: 'Embeddings' },
	{ name: 'Vision' },
];

/** Splits a series total across weights so columns add up to it (in K tokens). */
function spread(totals: number[], weights: number[][], labels: string[]) {
	// round every cell, then push the rounding drift into the last column so the legend sums exactly
	const cells = totals.map((total, series) => {
		const row = weights[series];
		const sum = row.reduce((a, b) => a + b, 0);
		const rounded = row.map((weight) => Math.round((total * weight) / sum));
		const drift = total - rounded.reduce((a, b) => a + b, 0);
		rounded[rounded.length - 1] += drift;
		return rounded;
	});
	return labels.map((label, column) => ({
		label,
		values: cells.map((row) => row[column] * 1000),
	}));
}

/** transitions.dev "Chart card": period tabs under the title, stacked bars that morph. */
export const DEMO_CHART: ChartCardData = {
	type: 'chart',
	title: 'Token spend',
	eyebrow: 'OpenAI · Usage',
	status: 'info',
	nodeType: '@n8n/n8n-nodes-langchain.openAi',
	nodeName: 'Usage report',
	itemCount: 1,
	source: 'declared',
	tone: 'sky',
	kind: 'stacked',
	range: 'Jul 1 – 7',
	totalLabel: 'Tokens',
	series: CHART_SERIES,
	columns: spread(
		[640, 480, 300, 240],
		[
			[14, 15, 16, 20, 15, 11, 9],
			[12, 16, 14, 19, 15, 13, 11],
			[13, 14, 18, 17, 16, 12, 10],
			[10, 13, 15, 22, 18, 12, 10],
		],
		['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
	),
	facts: [
		{ label: 'Requests', value: '184K' },
		{ label: 'Estimated cost', value: '$412' },
		{ label: 'Peak day', value: 'Thu' },
	],
	switcher: {
		control: 'segmented',
		placement: 'top',
		label: 'Period',
		options: [
			{ key: 'week', label: 'Week' },
			{ key: 'month', label: 'Month' },
			{ key: 'year', label: 'Year' },
		],
		default: 'week',
	},
	variants: {
		month: {
			range: 'July',
			columns: spread(
				[2800, 1900, 1300, 900],
				[
					[12, 14, 15, 19, 16, 13, 11],
					[10, 15, 14, 16, 17, 15, 13],
					[14, 12, 16, 15, 14, 17, 12],
					[9, 13, 17, 18, 15, 14, 14],
				],
				['1', '5', '10', '15', '20', '25', '30'],
			),
			facts: [
				{ label: 'Requests', value: '810K' },
				{ label: 'Estimated cost', value: '$1,780' },
				{ label: 'Peak day', value: 'Jul 14' },
			],
		},
		year: {
			range: '2025',
			columns: spread(
				[31000, 22500, 14000, 9800],
				[
					[10, 17, 14, 15, 13, 14, 17],
					[12, 15, 16, 13, 14, 15, 15],
					[9, 14, 15, 16, 16, 14, 16],
					[11, 16, 13, 14, 15, 15, 16],
				],
				['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov', 'Dec'],
			),
			facts: [
				{ label: 'Requests', value: '9.6M' },
				{ label: 'Estimated cost', value: '$21.4K' },
				{ label: 'Peak day', value: 'Mar' },
			],
		},
	},
};

/** transitions.dev "Heart Rate Monitor": a menu switches the range; the trace speeds up. */
export const DEMO_PULSE: PulseCardData = {
	type: 'pulse',
	title: 'Heart rate',
	eyebrow: 'Health · Live reading',
	status: 'info',
	nodeType: 'n8n-nodes-base.webhook',
	nodeName: 'Heart rate webhook',
	itemCount: 1,
	source: 'declared',
	tone: 'paper',
	value: 72,
	unit: 'bpm',
	label: 'Heart rate',
	live: true,
	period: 2.4,
	section: 'Core strength',
	stats: [
		{ label: 'Current', value: '1.6', unit: 'sec/sqt' },
		{ label: 'Average', value: '2.2', unit: 'sec/sqt' },
		{ label: 'Max', value: '4.2', unit: 'sec/sqt' },
	],
	switcher: {
		control: 'menu',
		label: 'Range',
		options: [
			{ key: 'resting', label: 'Resting' },
			{ key: 'active', label: 'Active' },
		],
		default: 'resting',
	},
	variants: {
		active: {
			value: 118,
			period: 1.4,
			stats: [
				{ label: 'Current', value: '2.9', unit: 'sec/sqt' },
				{ label: 'Average', value: '3.1', unit: 'sec/sqt' },
				{ label: 'Max', value: '4.2', unit: 'sec/sqt' },
			],
		},
	},
};

export const DEMO_CARDS = {
	email: DEMO_EMAIL,
	weather: DEMO_WEATHER,
	weatherSources: DEMO_WEATHER_SOURCES,
	event: DEMO_EVENT,
	ticket: DEMO_TICKET,
	chart: DEMO_CHART,
	pulse: DEMO_PULSE,
	records: DEMO_RECORDS,
	recordsMany: DEMO_RECORDS_MANY,
	metric: DEMO_METRIC,
	metricTrend: DEMO_METRIC_TREND,
	slack: DEMO_SLACK,
	telegram: DEMO_TELEGRAM,
	list: DEMO_LIST,
	keyValue: DEMO_KEY_VALUE,
	keyValuePaper: DEMO_KEY_VALUE_PAPER,
};
