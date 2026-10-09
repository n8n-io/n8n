import type {
	EmailCardData,
	KeyValueCardData,
	ListCardData,
	MessageCardData,
	MetricCardData,
	RecordsCardData,
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

export const DEMO_WEATHER: WeatherCardData = {
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
	forecast: [
		{ label: 'Sat', high: 17, low: 10, icon: 'partly-cloudy' },
		{ label: 'Sun', high: 15, low: 9, icon: 'cloud' },
		{ label: 'Mon', high: 12, low: 8, icon: 'rain' },
		{ label: 'Tue', high: 14, low: 7, icon: 'sun' },
		{ label: 'Wed', high: 16, low: 9, icon: 'sun' },
	],
};

export const DEMO_CARDS = {
	email: DEMO_EMAIL,
	weather: DEMO_WEATHER,
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
