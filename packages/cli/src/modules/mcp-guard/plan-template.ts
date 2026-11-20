// Pointers let a plan point at data of the real results instead of copying it. A string that is only
// a pointer, such as "$result.description" or "$reads[0].team.id", is replaced by the value it names.
// Text of a result that is not JSON cannot be pointed at.

const POINTER = /^\$(result|reads\[\d+\])((?:\.[\w-]+|\[\d+\])*)$/;
const STEP = /\.([\w-]+)|\[(\d+)\]/g;

export interface PointerContext {
	result: unknown;
	reads: unknown[];
	// The args of the call. Their ids are real too.
	args?: unknown;
}

function walk(root: unknown, path: string): unknown {
	let cur = root;
	for (const m of path.matchAll(STEP)) {
		if (cur === null || typeof cur !== 'object') return undefined;
		cur = (cur as Record<string, unknown>)[m[1] ?? m[2]];
	}
	return cur;
}

function resolvePointer(text: string, ctx: PointerContext): unknown {
	const m = POINTER.exec(text);
	if (!m) return text;
	const read = /^reads\[(\d+)\]$/.exec(m[1]);
	return walk(read ? ctx.reads[Number(read[1])] : ctx.result, m[2]);
}

/** Replaces the pointers in a plan. A pointer that names nothing drops its key or array item. */
export function fillPointers(value: unknown, ctx: PointerContext): unknown {
	if (typeof value === 'string') return resolvePointer(value, ctx);
	if (Array.isArray(value)) {
		return value.map((v) => fillPointers(v, ctx)).filter((v) => v !== undefined);
	}
	if (value !== null && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			const filled = fillPointers(v, ctx);
			if (filled !== undefined) out[k] = filled;
		}
		return out;
	}
	return value;
}

const UUID = /[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/gi;
const KEY = /\b[A-Z][A-Z0-9]+-\d+\b/g;

// An issue key without its dash: trust1209.
const KEY_ID = /^[a-z][a-z0-9]{1,30}\d$/;
const squash = (s: string): string => s.toLowerCase().replace(/-/g, '');

/** The ids a call names in its args: UUIDs (also inside urls) and issue keys such as TRUST-1209. */
export function idsInArgs(args: unknown): string[] {
	const found = new Set<string>();
	const visit = (v: unknown) => {
		if (typeof v === 'string') {
			for (const m of v.matchAll(UUID)) found.add(squash(m[0]));
			for (const m of v.matchAll(KEY)) found.add(squash(m[0]));
		} else if (Array.isArray(v)) v.forEach(visit);
		else if (v !== null && typeof v === 'object') Object.values(v).forEach(visit);
	};
	visit(args);
	return [...found];
}

/** The ids of `ids` that the text does not show. Dashes and case do not matter. */
export function missingIds(ids: string[], text: string): string[] {
	const haystack = squash(text);
	// An issue key must match whole: TRUST-1209 does not show TRUST-120.
	const keys = new Set(
		[...text.toLowerCase().matchAll(/(?<![a-z0-9])[a-z][a-z0-9]*-\d+(?![a-z0-9])/g)].map((m) =>
			squash(m[0]),
		),
	);
	return ids.filter(
		(id) => !(id.length < 32 && KEY_ID.test(id) ? keys.has(id) : haystack.includes(id)),
	);
}

const ID_KEYS: ReadonlySet<string> = new Set(['id', 'data_source_id']);
const WHOLE_UUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

/** The UUIDs that appear in the given values: the real data a plan may take ids from. */
export function provenIds(...sources: unknown[]): Set<string> {
	const found = new Set<string>();
	for (const source of sources) {
		const text = typeof source === 'string' ? source : (JSON.stringify(source) ?? '');
		for (const m of text.matchAll(UUID)) found.add(squash(m[0]));
	}
	return found;
}

/**
 * Removes the id and data_source_id of a plan that are not a UUID of the real data. A model
 * invents an id when the real result has none, and the gym refuses a bad id. Without an id the
 * gym makes one. Ids of the real data stay, so the objects keep their real ids.
 */
export function dropUnprovenIds(
	value: unknown,
	proven: ReadonlySet<string>,
	// Text of the real data, for a vendor whose ids are no UUIDs. An `id` that it shows stays.
	opaqueSource?: string,
): unknown {
	if (Array.isArray(value)) return value.map((v) => dropUnprovenIds(v, proven, opaqueSource));
	if (value === null || typeof value !== 'object') return value;
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(value)) {
		const isId = ID_KEYS.has(k) && typeof v === 'string';
		const realOpaque =
			k === 'id' && typeof v === 'string' && v.length >= 5 && opaqueSource?.includes(v) === true;
		if (isId && !realOpaque && !(WHOLE_UUID.test(v) && proven.has(squash(v)))) continue;
		out[k] = dropUnprovenIds(v, proven, opaqueSource);
	}
	return out;
}

// Keys whose string values the model writes itself, because they name the gym's structure and not data.
const STRUCTURE_KEYS: ReadonlySet<string> = new Set([
	'ref',
	'type',
	'color',
	'parent',
	'team',
	'project',
	'assignee',
	'lead',
	'labels',
	'by',
	'user',
	'creator',
	'owner',
	'data_source',
	'dual',
	'timezone',
]);
// Type names of the gym's world formats. They are not in the real data under these names.
// "Untitled" is the name that Notion shows for a page without a title.
const STRUCTURE_VALUES: ReadonlySet<string> = new Set([
	'Untitled',
	'title',
	'rich_text',
	'number',
	'select',
	'multi_select',
	'status',
	'date',
	'checkbox',
	'url',
	'email',
	'phone_number',
	'backlog',
	'unstarted',
	'started',
	'completed',
	'canceled',
	'triage',
]);
// A ref such as "team:eng" or "issue:TRUST-1209". A url is not a ref.
const REF = /^[a-z_]+:[^\s/]+$/;

const normalizeText = (s: string): string => s.replace(/\s+/g, ' ').trim().toLowerCase();

/** All the text of the real data: every string of the given values, as one searchable text. */
export function knownText(...sources: unknown[]): string {
	const parts: string[] = [];
	const visit = (v: unknown) => {
		if (typeof v === 'string') parts.push(v);
		else if (Array.isArray(v)) v.forEach(visit);
		else if (v !== null && typeof v === 'object') Object.values(v).forEach(visit);
	};
	sources.forEach(visit);
	return normalizeText(parts.join('\n'));
}

const isFree = (key: string, value: string, known: string): boolean =>
	value.trim().length <= 2 ||
	STRUCTURE_KEYS.has(key) ||
	STRUCTURE_VALUES.has(value) ||
	REF.test(value) ||
	known.includes(normalizeText(value)) ||
	// An id has two spellings: with dashes, and without them as a url shows it.
	(WHOLE_UUID.test(value) &&
		known.replace(/-/g, '').includes(normalizeText(value).replace(/-/g, '')));

export interface UnprovenLiteral {
	path: string;
	value: string;
}

/**
 * Removes the strings of a plan that the real data does not contain, and lists them. A model can
 * type a value that looks right and is not. Ids are checked by dropUnprovenIds. Structure (refs,
 * types, colors) is free. Text that a pointer filled is in the real data by definition.
 */
export function removeUnprovenLiterals(
	value: unknown,
	known: string,
): { cleaned: unknown; flagged: UnprovenLiteral[] } {
	const flagged: UnprovenLiteral[] = [];
	const visit = (v: unknown, key: string, path: string): unknown => {
		if (typeof v === 'string') {
			if (isFree(key, v, known)) return v;
			flagged.push({ path, value: v.slice(0, 60) });
			return undefined;
		}
		if (Array.isArray(v)) {
			// An array under a structure key (labels, owners) holds structure too.
			return v.map((x, i) => visit(x, key, `${path}[${i}]`)).filter((x) => x !== undefined);
		}
		if (v !== null && typeof v === 'object') {
			const out: Record<string, unknown> = {};
			for (const [k, x] of Object.entries(v)) {
				const r = visit(x, k, path ? `${path}.${k}` : k);
				if (r !== undefined) out[k] = r;
			}
			return out;
		}
		return v;
	};
	return { cleaned: visit(value, '', ''), flagged };
}
