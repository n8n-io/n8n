/**
 * Expression X-Ray: turn `[undefined]` expression results into actionable
 * diagnoses by walking the property path against the actual input data.
 *
 * Pure functions only — resolving the base value ($json etc.) and turning a
 * Diagnosis into an i18n message is the caller's job.
 */

export type PathPart = string | number;

export interface ParsedChain {
	/** e.g. `$json` or `$('Webhook').item.json` */
	base: string;
	/** property path after the base, e.g. ['user', 'email'] or ['items', 0, 'name'] */
	parts: PathPart[];
}

export type Diagnosis =
	| {
			kind: 'unknownField';
			key: string;
			path: string;
			candidates: string[];
			suggestedExpression?: string;
			/** just the part that changes, for compact display (e.g. `email`) */
			suggestionLabel?: string;
	  }
	| {
			kind: 'arrayNotObject';
			key: string;
			path: string;
			suggestedExpression?: string;
			suggestionLabel?: string;
	  }
	| { kind: 'notAnObject'; key: string; path: string; valueType: string };

// ponytail: json item paths only ($binary, $now chains etc. return null) — widen when needed
// matches bases: $json | ($input | $('Node')) . (item | first() | last() | all()[n]) . json
const BASE_RE =
	/^(\$json|(?:\$input|\$\((?:'[^']+'|"[^"]+")\))\.(?:item|first\(\)|last\(\)|all\(\)\[\d+\])\.json)/;
const PART_RE =
	/(?:\?\.|\.)([A-Za-z_$][\w$]*)|(?:\?\.)?\[(?:(\d+)|'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\]/y;

/**
 * Parse a resolvable like `{{ $json.user.email }}` into base + property path.
 * Returns null for anything that isn't a plain property chain (method calls,
 * ternaries, arithmetic, ...) — those are out of scope for the diagnoser.
 */
export function parseExpressionChain(resolvable: string): ParsedChain | null {
	const expr = resolvable.replace(/^{{|}}$/g, '').trim();
	const baseMatch = BASE_RE.exec(expr);
	if (!baseMatch) return null;

	const base = baseMatch[1];
	const parts: PathPart[] = [];
	// a failed sticky exec resets lastIndex to 0, so track consumption separately
	let consumed = base.length;
	PART_RE.lastIndex = consumed;
	let match: RegExpExecArray | null;
	while ((match = PART_RE.exec(expr)) !== null) {
		if (match[1] !== undefined) parts.push(match[1]);
		else if (match[2] !== undefined) parts.push(Number(match[2]));
		else parts.push((match[3] ?? match[4] ?? '').replace(/\\(.)/g, '$1'));
		consumed = PART_RE.lastIndex;
	}
	// reject unless the whole expression is a chain with at least one part
	if (parts.length === 0 || consumed !== expr.length) return null;

	return { base, parts };
}

const isIdentifier = (s: string) => /^[A-Za-z_$][\w$]*$/.test(s);

export function buildExpression(base: string, parts: PathPart[]): string {
	const path = parts
		.map((p) => {
			if (typeof p === 'number') return `[${p}]`;
			return isIdentifier(p) ? `.${p}` : `['${p.replace(/'/g, "\\'")}']`;
		})
		.join('');
	return `{{ ${base}${path} }}`;
}

function levenshtein(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	let prev = Array.from({ length: n + 1 }, (_, i) => i);
	for (let i = 1; i <= m; i++) {
		const curr = [i];
		for (let j = 1; j <= n; j++) {
			curr[j] = Math.min(
				prev[j] + 1,
				curr[j - 1] + 1,
				prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
			);
		}
		prev = curr;
	}
	return prev[n];
}

const normalizeKey = (s: string) => s.toLowerCase().replace(/[_\- ]/g, '');

/** Closest candidate to `key`: normalized (case/snake/camel) match wins, else small edit distance. */
export function closestKey(key: string, candidates: string[]): string | undefined {
	const normalized = normalizeKey(key);
	const exact = candidates.find((c) => normalizeKey(c) === normalized);
	if (exact) return exact;

	const maxDistance = Math.max(2, Math.ceil(key.length / 3));
	let best: string | undefined;
	let bestDistance = maxDistance + 1;
	for (const candidate of candidates) {
		const distance = levenshtein(key.toLowerCase(), candidate.toLowerCase());
		if (distance < bestDistance) {
			bestDistance = distance;
			best = candidate;
		}
	}
	if (bestDistance <= maxDistance) return best;

	// 'user' vs 'user_account', 'user_email' vs 'email': edit distance can't
	// catch a stem or an extra token, but containment can — suggest only when
	// it's unambiguous and both sides are long enough to mean something
	if (normalized.length >= 3) {
		const containmentMatches = candidates.filter((c) => {
			const n = normalizeKey(c);
			return n.length >= 3 && (n.includes(normalized) || normalized.includes(n));
		});
		if (containmentMatches.length === 1) return containmentMatches[0];
	}

	return undefined;
}

const formatPart = (p: PathPart): string =>
	typeof p === 'number' ? `[${p}]` : isIdentifier(p) ? `.${p}` : `['${p}']`;

function resolvesPath(value: unknown, parts: PathPart[]): boolean {
	let current = value;
	for (const part of parts) {
		if (current === null || typeof current !== 'object') return false;
		current = (current as Record<PathPart, unknown>)[part];
		if (current === undefined) return false;
	}
	return true;
}

/**
 * Walk the parsed path against the resolved base value and explain the first
 * broken link. Returns null if the whole path resolves (nothing to diagnose).
 */
export function diagnosePath(chain: ParsedChain, root: unknown): Diagnosis | null {
	let current = root;
	let path = chain.base;

	for (let i = 0; i < chain.parts.length; i++) {
		const part = chain.parts[i];

		if (current === null || typeof current !== 'object') {
			return {
				kind: 'notAnObject',
				key: String(part),
				path,
				valueType: current === null ? 'null' : current === undefined ? 'undefined' : typeof current,
			};
		}

		if (Array.isArray(current) && typeof part === 'string') {
			const first: unknown = current[0];
			const suggestion =
				first !== null && typeof first === 'object' && Object.keys(first).includes(part)
					? buildExpression(chain.base, [...chain.parts.slice(0, i), 0, ...chain.parts.slice(i)])
					: undefined;
			const arrayName = i > 0 ? String(chain.parts[i - 1]) : chain.base;
			return {
				kind: 'arrayNotObject',
				key: String(part),
				path,
				suggestedExpression: suggestion,
				suggestionLabel: suggestion ? `${arrayName}[0]` : undefined,
			};
		}

		const record = current as Record<string, unknown>;
		const next: unknown = record[part as keyof typeof record];
		if (next === undefined) {
			const candidates = Object.keys(record);
			if (candidates.includes(String(part))) return null; // field exists, value is genuinely undefined

			// `$json.user.email` with a `user_email` field: the intended field may
			// correspond to several path segments joined, so try longest-first.
			// Joins must match a field exactly (normalized) — fuzzier tiers on a
			// join would swallow path segments that belong after the fixed key.
			// A suggestion only counts if the rest of the path resolves on it.
			let suggestion: string | undefined;
			let replaceEnd = i + 1;
			if (typeof part === 'string') {
				for (let j = chain.parts.length; j > i + 1; j--) {
					const tail = chain.parts.slice(i, j);
					if (!tail.every((p) => typeof p === 'string')) continue;
					const joined = normalizeKey(tail.join('_'));
					const exact = candidates.find((c) => normalizeKey(c) === joined);
					if (exact && resolvesPath(record[exact], chain.parts.slice(j))) {
						suggestion = exact;
						replaceEnd = j;
						break;
					}
				}

				if (!suggestion) {
					const rest = chain.parts.slice(i + 1);
					const fuzzy = closestKey(part, candidates);
					if (fuzzy && resolvesPath(record[fuzzy], rest)) {
						suggestion = fuzzy;
					} else if (rest.length > 0) {
						// no name-based match: the shape of the remaining path may
						// single out the intended field ($json.home.street → address)
						const structural = candidates.filter((c) => resolvesPath(record[c], rest));
						if (structural.length === 1) suggestion = structural[0];
					}
				}
			}
			return {
				kind: 'unknownField',
				key: String(part),
				path,
				candidates,
				suggestedExpression: suggestion
					? buildExpression(chain.base, [
							...chain.parts.slice(0, i),
							suggestion,
							...chain.parts.slice(replaceEnd),
						])
					: undefined,
				suggestionLabel: suggestion,
			};
		}

		current = next;
		path += formatPart(part);
	}

	return null;
}
