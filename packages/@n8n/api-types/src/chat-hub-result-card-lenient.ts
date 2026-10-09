import { z } from 'zod';

import {
	resultCardSchema,
	resultCardTones,
	weatherConditionIcons,
	type ResultCard,
	type ResultCardArchetype,
	type ResultCardStatus,
	type ResultCardTone,
	type WeatherConditionIcon,
} from './chat-hub-result-card';

/**
 * LLM-authored result cards: the same strict wire format as `resultCardSchema`,
 * reached through a normalisation pass that forgives the ways a model tends to
 * drift from the spec — numbers as strings (and vice versa), `delta` written as
 * one string, a missing `delta.direction`, colour words instead of tone names,
 * over-long text and over-full lists. Anything the pass can't make sense of is
 * dropped (optional) or left for the strict schema to report (required), so
 * the card that renders is always a valid `ResultCard`.
 */

type Dict = Record<string, unknown>;

const isDict = (value: unknown): value is Dict =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const ARCHETYPE_ALIASES: Record<string, ResultCardArchetype> = {
	email: 'email',
	mail: 'email',
	message: 'message',
	msg: 'message',
	chat: 'message',
	notification: 'message',
	records: 'records',
	record: 'records',
	table: 'records',
	rows: 'records',
	metric: 'metric',
	metrics: 'metric',
	figure: 'metric',
	stat: 'metric',
	stats: 'metric',
	kpi: 'metric',
	list: 'list',
	items: 'list',
	ranking: 'list',
	bullets: 'list',
	keyvalue: 'keyValue',
	key_value: 'keyValue',
	'key-value': 'keyValue',
	kv: 'keyValue',
	details: 'keyValue',
	detail: 'keyValue',
	summary: 'keyValue',
	weather: 'weather',
	forecast: 'weather',
	climate: 'weather',
};

const TONE_ALIASES: Record<string, ResultCardTone> = {
	neutral: 'paper',
	default: 'paper',
	light: 'paper',
	white: 'paper',
	beige: 'paper',
	cream: 'paper',
	sand: 'paper',
	gray: 'graphite',
	grey: 'graphite',
	dark: 'graphite',
	black: 'graphite',
	slate: 'graphite',
	charcoal: 'graphite',
	green: 'forest',
	emerald: 'forest',
	success: 'forest',
	positive: 'forest',
	blue: 'sky',
	cyan: 'sky',
	info: 'sky',
	purple: 'aubergine',
	violet: 'aubergine',
	plum: 'aubergine',
	lilac: 'lavender',
	pink: 'lavender',
	teal: 'mint',
	aqua: 'mint',
	red: 'terracotta',
	orange: 'terracotta',
	amber: 'terracotta',
	brown: 'terracotta',
	error: 'terracotta',
	danger: 'terracotta',
	warning: 'terracotta',
	negative: 'terracotta',
};

const STATUS_ALIASES: Record<string, ResultCardStatus> = {
	success: 'success',
	succeeded: 'success',
	ok: 'success',
	done: 'success',
	completed: 'success',
	healthy: 'success',
	error: 'error',
	errored: 'error',
	failed: 'error',
	fail: 'error',
	failure: 'error',
	danger: 'error',
	critical: 'error',
	pending: 'pending',
	waiting: 'pending',
	running: 'pending',
	in_progress: 'pending',
	'in-progress': 'pending',
	scheduled: 'pending',
	open: 'pending',
	info: 'info',
	neutral: 'info',
	note: 'info',
	warning: 'info',
	warn: 'info',
};

const RECORD_OPERATION_ALIASES: Record<string, 'append' | 'update' | 'upsert' | 'read' | 'delete'> = {
	append: 'append',
	insert: 'append',
	create: 'append',
	created: 'append',
	add: 'append',
	added: 'append',
	update: 'update',
	updated: 'update',
	edit: 'update',
	modify: 'update',
	upsert: 'upsert',
	read: 'read',
	list: 'read',
	get: 'read',
	fetch: 'read',
	query: 'read',
	search: 'read',
	found: 'read',
	delete: 'delete',
	deleted: 'delete',
	remove: 'delete',
	removed: 'delete',
};

const MESSAGE_CHANNELS = [
	'slack',
	'telegram',
	'discord',
	'whatsapp',
	'teams',
	'sms',
	'chat',
	'other',
] as const;

const DIRECTION_ALIASES: Record<string, 'up' | 'down' | 'flat'> = {
	up: 'up',
	increase: 'up',
	increased: 'up',
	rising: 'up',
	higher: 'up',
	positive: 'up',
	growth: 'up',
	down: 'down',
	decrease: 'down',
	decreased: 'down',
	falling: 'down',
	lower: 'down',
	negative: 'down',
	drop: 'down',
	flat: 'flat',
	neutral: 'flat',
	same: 'flat',
	unchanged: 'flat',
	stable: 'flat',
	none: 'flat',
};

const lower = (value: unknown): string | undefined =>
	typeof value === 'string' ? value.trim().toLowerCase() : undefined;

/** Plain text clamped to the schema limit, with numbers/booleans rendered as text. */
function text(value: unknown, max: number): string | undefined {
	let str: string;
	if (typeof value === 'string') str = value;
	else if (typeof value === 'number' && Number.isFinite(value)) str = String(value);
	else if (typeof value === 'boolean') str = value ? 'Yes' : 'No';
	else return undefined;
	if (str.length <= max) return str;
	return max > 1 ? `${str.slice(0, max - 1).trimEnd()}…` : str.slice(0, max);
}

/** `text()` but an empty/whitespace string counts as absent. */
const nonEmptyText = (value: unknown, max: number): string | undefined => {
	const str = text(value, max);
	return str?.trim() ? str : undefined;
};

const SUFFIX_MULTIPLIERS: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };

/** The first number in a value: "681", "1,234.5", "12.4k", "€8,200", "Invoice sync (3)". */
function num(value: unknown): number | undefined {
	if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
	if (typeof value !== 'string') return undefined;
	const match = /-?\d[\d,]*(?:\.\d+)?\s*([kmb])?(?![a-z])/i.exec(value.replace(/\s+/g, ' '));
	if (!match) return undefined;
	const parsed = Number(match[0].replace(/[,\s]/g, '').replace(/[kmb]$/i, ''));
	if (!Number.isFinite(parsed)) return undefined;
	const suffix = match[1]?.toLowerCase();
	return suffix ? parsed * SUFFIX_MULTIPLIERS[suffix] : parsed;
}

function count(value: unknown): number | undefined {
	const parsed = num(value);
	if (parsed === undefined || parsed < 0) return undefined;
	return Math.round(parsed);
}

const list = (value: unknown): unknown[] | undefined => (Array.isArray(value) ? value : undefined);

const httpsHref = (value: unknown): string | undefined =>
	typeof value === 'string' && value.startsWith('https://') && value.length <= 2048
		? value
		: undefined;

function textList(value: unknown, max: number, itemMax: number): string[] | undefined {
	const source = typeof value === 'string' ? value.split(/\s*[,;]\s*/) : list(value);
	if (!source) return undefined;
	const items = source
		.map((item) => nonEmptyText(item, itemMax))
		.filter((item): item is string => item !== undefined)
		.slice(0, max);
	return items.length ? items : undefined;
}

function pick(dict: Dict, ...keys: string[]): unknown {
	for (const key of keys) {
		if (dict[key] !== undefined && dict[key] !== null) return dict[key];
	}
	return undefined;
}

function set(target: Dict, key: string, value: unknown): void {
	if (value !== undefined) target[key] = value;
}

function direction(value: unknown): 'up' | 'down' | 'flat' | undefined {
	const key = lower(value);
	return key ? DIRECTION_ALIASES[key] : undefined;
}

/** Infer the direction from arrows, signs or words in a delta text like "↓ 0.4 pp vs. yesterday". */
function inferDirection(value: string): 'up' | 'down' | 'flat' {
	const lowered = value.toLowerCase();
	if (/[↑▲⬆]|\bup\b|\bincrease|\bhigher\b|\bmore\b|\bgain/.test(lowered)) return 'up';
	if (/[↓▼⬇]|\bdown\b|\bdecrease|\blower\b|\bfewer\b|\bless\b|\bdrop|\bloss/.test(lowered)) {
		return 'down';
	}
	if (/[→⟶]|\bflat\b|\bunchanged\b|\bno change\b|\bsame\b|\bstable\b/.test(lowered)) return 'flat';
	const figure = num(value);
	if (figure === undefined || figure === 0) return 'flat';
	return figure < 0 || /^\s*[-−]/.test(value) ? 'down' : 'up';
}

const DELTA_LABEL_SEPARATOR = /\s+(?=(?:vs\.?|versus|from|compared|since|over|than|against|on)\b)/i;

/** A delta given as one string: split the figure from its comparison label. */
function deltaFromText(raw: string): Dict | undefined {
	const trimmed = raw.trim();
	if (!trimmed) return undefined;
	const dir = inferDirection(trimmed);
	const withoutGlyphs = trimmed
		.replace(/^[↑↓→▲▼⬆⬇⟶]+\s*/u, '')
		.replace(/^(?:up|down|flat|increase[d]?|decrease[d]?)\s+(?:by\s+)?/i, '')
		.trim();
	const [valuePart, ...labelParts] = withoutGlyphs.split(DELTA_LABEL_SEPARATOR);
	const value = nonEmptyText(valuePart, 24) ?? nonEmptyText(withoutGlyphs, 24);
	if (!value) return undefined;
	const delta: Dict = { value, direction: dir };
	set(delta, 'label', nonEmptyText(labelParts.join(' '), 40));
	return delta;
}

function normalizeDelta(raw: unknown): Dict | undefined {
	if (typeof raw === 'string') return deltaFromText(raw);
	if (typeof raw === 'number') return deltaFromText(String(raw));
	if (!isDict(raw)) return undefined;
	const valueRaw = pick(raw, 'value', 'amount', 'change', 'text');
	const value = nonEmptyText(valueRaw, 24);
	if (!value) return undefined;
	const delta: Dict = {
		value,
		direction:
			direction(raw.direction) ??
			direction(raw.trend) ??
			inferDirection(typeof valueRaw === 'string' ? valueRaw : value),
	};
	set(delta, 'label', nonEmptyText(pick(raw, 'label', 'period', 'comparedTo', 'compared_to'), 40));
	return delta;
}

/** `{label, value}` rows from an array of objects, an array of tuples, or a `{label: value}` map. */
function labelledEntries(raw: unknown, labelKeys: string[], valueKeys: string[]): Dict[] {
	if (isDict(raw)) return Object.entries(raw).map(([label, value]) => ({ label, value }));
	const items = list(raw);
	if (!items) return [];
	return items.flatMap((item) => {
		if (Array.isArray(item)) return item.length >= 2 ? [{ label: item[0], value: item[1] }] : [];
		if (isDict(item)) {
			return [{ label: pick(item, ...labelKeys), value: pick(item, ...valueKeys), extra: item }];
		}
		return [];
	});
}

function normalizeBreakdown(raw: unknown): Dict[] | undefined {
	const rows = labelledEntries(raw, ['label', 'name', 'key', 'title'], ['value', 'count', 'amount', 'total'])
		.map((entry) => {
			const label = nonEmptyText(entry.label, 60);
			const value = num(entry.value);
			if (!label || value === undefined) return undefined;
			const row: Dict = { label, value };
			const share = isDict(entry.extra) ? num(entry.extra.share) : undefined;
			if (share !== undefined && share >= 0 && share <= 1) row.share = share;
			return row;
		})
		.filter((row): row is Dict => row !== undefined)
		.slice(0, 5);
	return rows.length ? rows : undefined;
}

function normalizeTrend(raw: unknown): number[] | undefined {
	const points = (list(raw) ?? [])
		.map((point) => (isDict(point) ? num(pick(point, 'value', 'y', 'count')) : num(point)))
		.filter((point): point is number => point !== undefined)
		.slice(0, 30);
	return points.length ? points : undefined;
}

function normalizeEnvelope(card: Dict, target: Dict): void {
	set(target, 'title', nonEmptyText(pick(card, 'title', 'heading', 'name'), 80));
	set(target, 'eyebrow', nonEmptyText(pick(card, 'eyebrow', 'kicker', 'category'), 40));
	const status = lower(card.status);
	set(target, 'status', status ? STATUS_ALIASES[status] : undefined);
	set(target, 'statusLabel', nonEmptyText(pick(card, 'statusLabel', 'status_label'), 16));
	set(target, 'nodeType', nonEmptyText(card.nodeType, 120));
	set(target, 'nodeName', nonEmptyText(card.nodeName, 120));
	set(target, 'itemCount', count(pick(card, 'itemCount', 'item_count')));
	if (card.source === 'mapped' || card.source === 'declared' || card.source === 'jev') {
		target.source = card.source;
	}
	const toneKey = lower(card.tone ?? card.color ?? card.colour);
	if (toneKey) {
		const tone = (resultCardTones as readonly string[]).includes(toneKey)
			? (toneKey as ResultCardTone)
			: TONE_ALIASES[toneKey];
		set(target, 'tone', tone);
	}
	const actions = (list(pick(card, 'actions', 'links', 'buttons')) ?? [])
		.map((action) => {
			if (!isDict(action)) return undefined;
			const label = nonEmptyText(pick(action, 'label', 'text', 'title'), 40);
			const href = httpsHref(pick(action, 'href', 'url', 'link'));
			return label && href ? { label, href } : undefined;
		})
		.filter((action): action is { label: string; href: string } => action !== undefined)
		.slice(0, 2);
	if (actions.length) target.actions = actions;
	if (isDict(card.cover)) {
		const src = typeof card.cover.src === 'string' ? card.cover.src : undefined;
		if (src?.startsWith('https://images.unsplash.com/') && src.length <= 2048) {
			const cover: Dict = { src };
			set(cover, 'alt', nonEmptyText(card.cover.alt, 120));
			target.cover = cover;
		}
	}
	set(target, 'nodeTypes', textList(card.nodeTypes, 4, 120));
}

function normalizeMetric(card: Dict, target: Dict): void {
	set(target, 'value', nonEmptyText(pick(card, 'value', 'number', 'amount', 'figure'), 24));
	set(target, 'unit', nonEmptyText(card.unit, 16));
	set(target, 'label', nonEmptyText(pick(card, 'label', 'caption', 'subtitle', 'description'), 60));
	set(target, 'delta', normalizeDelta(pick(card, 'delta', 'change', 'comparison')));
	set(target, 'breakdown', normalizeBreakdown(pick(card, 'breakdown', 'segments', 'bars')));
	set(target, 'trend', normalizeTrend(pick(card, 'trend', 'sparkline', 'history', 'series')));
}

/** The cells of one row: a tuple as-is, an object read in column order (case-insensitive keys). */
function rowCells(row: unknown, columns: string[] | undefined): unknown[] | undefined {
	if (Array.isArray(row)) return row;
	if (!isDict(row)) return undefined;
	const keys = Object.keys(row);
	return (columns ?? keys).map((column) => {
		const key = keys.find((candidate) => candidate.toLowerCase() === column.toLowerCase());
		return key === undefined ? '' : row[key];
	});
}

function normalizeRecords(card: Dict, target: Dict): void {
	set(target, 'target', nonEmptyText(pick(card, 'target', 'table', 'sheet', 'destination'), 120));
	const operation = lower(card.operation ?? card.action);
	target.operation = (operation && RECORD_OPERATION_ALIASES[operation]) || 'read';
	const rawRows = list(pick(card, 'rows', 'records', 'items')) ?? [];
	const firstObjectRow = rawRows.find(isDict);
	const columns =
		textList(pick(card, 'columns', 'headers', 'fields'), 4, 60) ??
		(firstObjectRow ? textList(Object.keys(firstObjectRow), 4, 60) : undefined);
	set(target, 'columns', columns);
	const rows = rawRows
		.map((row) => rowCells(row, columns)?.slice(0, 4).map((cell) => text(cell ?? '', 120) ?? ''))
		.filter((row): row is string[] => row !== undefined)
		.slice(0, 5);
	target.rows = rows;
	target.total = count(pick(card, 'total', 'count', 'itemCount')) ?? rows.length;
}

function normalizeList(card: Dict, target: Dict): void {
	const items = (list(pick(card, 'items', 'entries', 'rows')) ?? [])
		.map((item) => {
			if (typeof item === 'string' || typeof item === 'number') {
				const title = nonEmptyText(item, 120);
				return title ? { title } : undefined;
			}
			if (!isDict(item)) return undefined;
			const title = nonEmptyText(pick(item, 'title', 'name', 'label', 'text'), 120);
			if (!title) return undefined;
			const entry: Dict = { title };
			set(entry, 'subtitle', nonEmptyText(pick(item, 'subtitle', 'description', 'detail'), 160));
			set(entry, 'meta', nonEmptyText(pick(item, 'meta', 'value', 'badge', 'date'), 40));
			set(entry, 'href', httpsHref(pick(item, 'href', 'url', 'link')));
			return entry;
		})
		.filter((item): item is Dict => item !== undefined)
		.slice(0, 5);
	target.items = items;
	set(target, 'total', count(pick(card, 'total', 'count')));
}

function normalizeKeyValue(card: Dict, target: Dict): void {
	const pairs = labelledEntries(
		pick(card, 'pairs', 'fields', 'items', 'entries', 'data'),
		['key', 'label', 'name', 'title'],
		['value', 'text'],
	)
		.map((entry) => {
			const key = nonEmptyText(entry.label, 60);
			const value = text(entry.value, 200);
			return key && value !== undefined ? { key, value } : undefined;
		})
		.filter((pair): pair is { key: string; value: string } => pair !== undefined)
		.slice(0, 6);
	target.pairs = pairs;
}

function normalizeEmail(card: Dict, target: Dict): void {
	const dir = lower(card.direction);
	target.direction =
		dir === 'received' || dir === 'inbound' || dir === 'incoming' || dir === 'in'
			? 'received'
			: 'sent';
	set(target, 'to', textList(pick(card, 'to', 'recipients', 'recipient'), 5, 120) ?? []);
	set(target, 'cc', textList(card.cc, 5, 120));
	set(target, 'from', nonEmptyText(pick(card, 'from', 'sender'), 120));
	set(target, 'subject', nonEmptyText(pick(card, 'subject', 'title'), 200));
	set(target, 'preview', nonEmptyText(pick(card, 'preview', 'snippet', 'body', 'text'), 240));
	set(target, 'attachments', textList(card.attachments, 5, 120));
	set(target, 'labels', textList(pick(card, 'labels', 'tags'), 5, 40));
}

const MESSAGE_CHANNEL_ALIASES: Record<string, (typeof MESSAGE_CHANNELS)[number]> = {
	'microsoft teams': 'teams',
	msteams: 'teams',
	text: 'sms',
	twilio: 'sms',
	'n8n chat': 'chat',
	'n8n-chat': 'chat',
};

function normalizeMessage(card: Dict, target: Dict): void {
	const channel = lower(pick(card, 'channel', 'platform', 'service'));
	if (channel && (MESSAGE_CHANNELS as readonly string[]).includes(channel)) {
		target.channel = channel;
	} else {
		target.channel = (channel && MESSAGE_CHANNEL_ALIASES[channel]) || 'other';
	}
	set(target, 'to', nonEmptyText(pick(card, 'to', 'recipient', 'channelName', 'destination'), 120));
	set(target, 'text', nonEmptyText(pick(card, 'text', 'message', 'body', 'preview'), 400));
	set(target, 'author', nonEmptyText(pick(card, 'author', 'from', 'sender'), 120));
	if (typeof card.isReply === 'boolean') target.isReply = card.isReply;
}

const CONDITION_ICON_RULES: Array<[RegExp, WeatherConditionIcon]> = [
	[/thunder|storm|lightning/, 'thunder'],
	[/snow|sleet|hail|blizzard|flurr/, 'snow'],
	[/drizzle|shower/, 'drizzle'],
	[/rain|wet/, 'rain'],
	[/fog|mist|haze|smoke/, 'fog'],
	[/wind|gale|breez/, 'wind'],
	[/partly|mostly sunny|some cloud|few cloud|scattered/, 'partly-cloudy'],
	[/cloud|overcast|grey|gray|dull/, 'cloud'],
	[/clear|sun|fair|bright/, 'sun'],
];

/** A glyph from the icon enum, an alias, or the words of a condition ("Light rain" → rain). */
function weatherIcon(value: unknown, condition: string | undefined): WeatherConditionIcon | undefined {
	const key = lower(value);
	if (key && (weatherConditionIcons as readonly string[]).includes(key)) {
		return key as WeatherConditionIcon;
	}
	const haystack = [key, lower(condition)].filter(Boolean).join(' ');
	if (!haystack) return undefined;
	return CONDITION_ICON_RULES.find(([pattern]) => pattern.test(haystack))?.[1];
}

function temperatureUnit(value: unknown): 'C' | 'F' | undefined {
	const key = lower(value)?.replace(/[°\s]/g, '');
	if (!key) return undefined;
	if (key === 'f' || key === 'fahrenheit') return 'F';
	if (key === 'c' || key === 'celsius' || key === 'centigrade') return 'C';
	return undefined;
}

function normalizeWeather(card: Dict, target: Dict): void {
	const location = nonEmptyText(pick(card, 'location', 'place', 'city'), 80);
	set(target, 'location', location);
	if (target.title === undefined) set(target, 'title', location);
	set(target, 'temperature', num(pick(card, 'temperature', 'temp', 'value')));
	set(target, 'unit', temperatureUnit(pick(card, 'unit', 'units', 'temperatureUnit')));
	const condition = nonEmptyText(pick(card, 'condition', 'summary', 'description', 'weather'), 40);
	set(target, 'condition', condition);
	set(target, 'icon', weatherIcon(card.icon, condition));
	set(target, 'feelsLike', num(pick(card, 'feelsLike', 'feels_like', 'apparentTemperature')));
	set(target, 'humidity', num(card.humidity));
	const windRaw = pick(card, 'wind', 'windSpeed', 'wind_speed');
	if (isDict(windRaw)) {
		const speed = num(pick(windRaw, 'speed', 'value'));
		if (speed !== undefined) {
			const unitKey = lower(windRaw.unit)?.replace(/\s/g, '');
			const wind: Dict = {
				speed,
				unit: unitKey === 'mph' ? 'mph' : unitKey === 'm/s' || unitKey === 'ms' ? 'm/s' : 'km/h',
			};
			set(wind, 'direction', nonEmptyText(pick(windRaw, 'direction', 'dir'), 4));
			target.wind = wind;
		}
	} else {
		const speed = num(windRaw);
		if (speed !== undefined) target.wind = { speed, unit: 'km/h' };
	}
	set(target, 'high', num(pick(card, 'high', 'max', 'tempMax', 'temperatureMax')));
	set(target, 'low', num(pick(card, 'low', 'min', 'tempMin', 'temperatureMin')));
	const sources = labelledEntries(
		pick(card, 'sources', 'providers', 'services'),
		['name', 'source', 'provider', 'label'],
		['temperature', 'temp', 'value'],
	)
		.map((entry) => {
			const name = nonEmptyText(entry.label, 40);
			const temperature = num(entry.value);
			if (!name || temperature === undefined) return undefined;
			const source: Dict = { name, temperature };
			if (isDict(entry.extra)) {
				set(source, 'condition', nonEmptyText(pick(entry.extra, 'condition', 'summary'), 40));
			}
			return source;
		})
		.filter((source): source is Dict => source !== undefined)
		.slice(0, 5);
	if (sources.length) target.sources = sources;
	else if (target.temperature !== undefined) {
		// A card without a comparison still has one source: whoever composed it.
		target.sources = [{ name: location ?? 'Forecast', temperature: target.temperature }];
	}
	const forecast = (list(pick(card, 'forecast', 'daily', 'days')) ?? [])
		.map((day) => {
			if (!isDict(day)) return undefined;
			const label = nonEmptyText(pick(day, 'label', 'day', 'date', 'name'), 12);
			const high = num(pick(day, 'high', 'max', 'tempMax'));
			const low = num(pick(day, 'low', 'min', 'tempMin'));
			if (!label || high === undefined || low === undefined) return undefined;
			const dayCondition = nonEmptyText(pick(day, 'condition', 'summary'), 40);
			const icon = weatherIcon(day.icon, dayCondition) ?? 'cloud';
			const forecastDay: Dict = { label, high, low, icon };
			return forecastDay;
		})
		.filter((day): day is Dict => day !== undefined)
		.slice(0, 5);
	if (forecast.length) target.forecast = forecast;
}

/**
 * Coerce an LLM-authored card into the strict wire shape where that is
 * unambiguous; return the input untouched when it isn't even an object so the
 * strict schema reports the real problem.
 */
export function normalizeResultCardInput(raw: unknown): unknown {
	if (!isDict(raw)) return raw;
	const card = isDict(raw.card) && raw.type === undefined ? raw.card : raw;
	const typeKey = lower(pick(card, 'type', 'kind', 'archetype', 'cardType'));
	const type = typeKey ? ARCHETYPE_ALIASES[typeKey] : undefined;
	if (!type) return raw;

	const target: Dict = { type };
	normalizeEnvelope(card, target);
	switch (type) {
		case 'metric':
			normalizeMetric(card, target);
			break;
		case 'records':
			normalizeRecords(card, target);
			break;
		case 'list':
			normalizeList(card, target);
			break;
		case 'keyValue':
			normalizeKeyValue(card, target);
			break;
		case 'email':
			normalizeEmail(card, target);
			break;
		case 'message':
			normalizeMessage(card, target);
			break;
		case 'weather':
			normalizeWeather(card, target);
			break;
	}
	return target;
}

/** `resultCardSchema` for cards an LLM wrote: normalised first, then validated strictly. */
export const lenientResultCardSchema: z.ZodType<ResultCard, z.ZodTypeDef, unknown> = z.preprocess(
	normalizeResultCardInput,
	resultCardSchema,
);
