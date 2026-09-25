export function str(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	try {
		return JSON.stringify(value);
	} catch {
		return '';
	}
}

export function truncate(value: string, max: number): string {
	return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

const ENTITIES: Record<string, string> = {
	'&nbsp;': ' ',
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#39;': "'",
};

export function stripHtml(value: string): string {
	return value
		.replace(/<br\s*\/?>/gi, ' ')
		.replace(/<\/(p|div|li|tr|h[1-6])>/gi, ' ')
		.replace(/<[^>]+>/g, '')
		.replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity] ?? entity)
		.replace(/\s+/g, ' ')
		.trim();
}

export function asStringList(value: unknown): string[] {
	const parts = Array.isArray(value) ? value.map(str) : str(value).split(',');
	return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

/** A non-null, non-array object — the only shape the mapper reads keys from. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): Record<string, unknown> {
	return isPlainObject(value) ? value : {};
}

/** Resource-locator values are `{ __rl: true, mode, value, cachedResultName? }` */
export function rlcLabel(value: unknown): string {
	const record = asRecord(value);
	if (record.__rl === true) return str(record.cachedResultName) || str(record.value);
	return str(value);
}

export function humanize(key: string): string {
	const spaced = key
		.replace(/^\$/, '')
		.replace(/[_-]+/g, ' ')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
	return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`;
}

export function formatNumber(value: number): string {
	return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

export function firstString(...values: unknown[]): string | undefined {
	for (const value of values) {
		const text = str(value).trim();
		if (text) return text;
	}
	return undefined;
}

/** `n8n-nodes-base.httpRequest` → `Http request`; `@n8n/n8n-nodes-langchain.agent` → `Agent` */
export function humanizeNodeType(nodeType: string): string {
	const last = nodeType.split('.').pop() ?? nodeType;
	return humanize(last.replace(/Tool$/, ''));
}
