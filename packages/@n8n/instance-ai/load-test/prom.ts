// ---------------------------------------------------------------------------
// Prometheus text-format parser
//
// The load test scrapes n8n's /metrics directly rather than standing up a
// Prometheus server, so it needs its own parser. prom-client can produce the
// text format but not consume it, and it isn't a dependency of this package.
//
// Format reference: https://prometheus.io/docs/instrumenting/exposition_formats/
// ---------------------------------------------------------------------------

export interface PromSample {
	name: string;
	labels: Record<string, string>;
	value: number;
}

/** Parsed scrape, indexed by series name (labels kept on each sample). */
export type PromSnapshot = Map<string, PromSample[]>;

/**
 * Parse a Prometheus text exposition payload.
 *
 * Unparseable lines are skipped rather than thrown on: a scrape is a
 * diagnostic, and one malformed series must not abort a load run that has
 * already spent real money on LLM calls.
 */
export function parsePromText(text: string): PromSnapshot {
	const snapshot: PromSnapshot = new Map();

	for (const rawLine of text.split('\n')) {
		const line = rawLine.trim();
		// `#` covers both HELP/TYPE metadata and plain comments.
		if (line === '' || line.startsWith('#')) continue;

		const parsed = parseLine(line);
		if (!parsed) continue;

		const existing = snapshot.get(parsed.name);
		if (existing) existing.push(parsed);
		else snapshot.set(parsed.name, [parsed]);
	}

	return snapshot;
}

function parseLine(line: string): PromSample | undefined {
	const braceStart = line.indexOf('{');

	let name: string;
	let labels: Record<string, string>;
	let rest: string;

	if (braceStart === -1) {
		const firstSpace = line.indexOf(' ');
		if (firstSpace === -1) return undefined;
		name = line.slice(0, firstSpace);
		labels = {};
		rest = line.slice(firstSpace + 1);
	} else {
		// Label values may contain spaces and escaped quotes, so scan for the
		// closing brace instead of splitting on whitespace.
		const braceEnd = findClosingBrace(line, braceStart);
		if (braceEnd === -1) return undefined;
		name = line.slice(0, braceStart);
		labels = parseLabels(line.slice(braceStart + 1, braceEnd));
		rest = line.slice(braceEnd + 1);
	}

	if (name === '') return undefined;

	// The value is the first token of the remainder; an optional timestamp may
	// follow, which we ignore (we stamp samples with our own scrape time).
	const valueToken = rest.trim().split(/\s+/)[0];
	if (valueToken === undefined || valueToken === '') return undefined;

	const value = parsePromValue(valueToken);
	if (value === undefined) return undefined;

	return { name, labels, value };
}

/** Prometheus spells these out rather than using JSON number syntax. */
function parsePromValue(token: string): number | undefined {
	switch (token) {
		case 'NaN':
			return Number.NaN;
		case '+Inf':
		case 'Inf':
			return Number.POSITIVE_INFINITY;
		case '-Inf':
			return Number.NEGATIVE_INFINITY;
		default: {
			const value = Number(token);
			return Number.isNaN(value) ? undefined : value;
		}
	}
}

function findClosingBrace(line: string, braceStart: number): number {
	let inQuotes = false;
	for (let i = braceStart + 1; i < line.length; i++) {
		const char = line[i];
		if (char === '\\') {
			i++; // skip the escaped character
			continue;
		}
		if (char === '"') inQuotes = !inQuotes;
		else if (char === '}' && !inQuotes) return i;
	}
	return -1;
}

function parseLabels(body: string): Record<string, string> {
	const labels: Record<string, string> = {};
	let i = 0;

	while (i < body.length) {
		const eq = body.indexOf('=', i);
		if (eq === -1) break;

		const key = body.slice(i, eq).trim();
		const quoteStart = body.indexOf('"', eq);
		if (quoteStart === -1) break;

		let value = '';
		let j = quoteStart + 1;
		for (; j < body.length; j++) {
			const char = body[j];
			if (char === '\\') {
				const next = body[j + 1];
				value += next === 'n' ? '\n' : (next ?? '');
				j++;
				continue;
			}
			if (char === '"') break;
			value += char;
		}

		if (key !== '') labels[key] = value;

		const comma = body.indexOf(',', j);
		if (comma === -1) break;
		i = comma + 1;
	}

	return labels;
}

// ---------------------------------------------------------------------------
// Readers
//
// All readers return `null` for an absent series rather than 0. An upstream
// rename (prom-client bump, metric refactor) then shows up as a blank column
// in the report instead of silently reading as "zero memory".
//
// They accept `undefined` for the whole snapshot too, so callers that could not
// scrape at all (cloud instance with /metrics firewalled) need no extra guards.
// ---------------------------------------------------------------------------

/** Single-value series (gauges with no labels). Returns the first sample. */
export function readValue(snapshot: PromSnapshot | undefined, name: string): number | null {
	const samples = snapshot?.get(name);
	if (!samples || samples.length === 0) return null;
	return samples[0].value;
}

/** Sum every label set of a series — e.g. `runs_total{status,model}`. */
export function readSum(snapshot: PromSnapshot | undefined, name: string): number | null {
	const samples = snapshot?.get(name);
	if (!samples || samples.length === 0) return null;
	return samples.reduce((total, sample) => total + sample.value, 0);
}

/** Sum a series filtered to the given labels (subset match). */
export function readSumWhere(
	snapshot: PromSnapshot | undefined,
	name: string,
	labels: Record<string, string>,
): number | null {
	const samples = snapshot?.get(name);
	if (!samples || samples.length === 0) return null;

	const matching = samples.filter((sample) =>
		Object.entries(labels).every(([key, value]) => sample.labels[key] === value),
	);
	if (matching.length === 0) return null;

	return matching.reduce((total, sample) => total + sample.value, 0);
}

/** First series name present in `candidates`, for names we can't pin exactly. */
export function readFirstAvailable(
	snapshot: PromSnapshot | undefined,
	candidates: readonly string[],
): number | null {
	for (const name of candidates) {
		const value = readValue(snapshot, name);
		if (value !== null) return value;
	}
	return null;
}
