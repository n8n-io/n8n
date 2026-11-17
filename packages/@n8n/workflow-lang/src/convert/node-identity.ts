/**
 * The identity of the Node.js whose behaviour a compiled workflow must copy.
 *
 * n8n's v1 engine formats dates and numbers, compares text and reads URLs with the Node.js
 * of the n8n process. That behaviour is data and code of the Node.js build: the ICU data
 * (`icu`, `cldr`), the time zone rules (`tz`), the Unicode tables (`unicode`), the glue of V8
 * between JavaScript and ICU (`v8`), and the URL parser (`ada`). No single version names it:
 * Node.js 22, 24 and 26 can all have ICU 78.3 and still give other text, because V8 changed.
 *
 * The target is the Node.js that runs the workflow on v1. By default it is this process (the
 * converter runs in the n8n process). A converter that runs in another place gives the
 * identity of the n8n process with `setTargetNode`. A form that copies Node.js compiles only
 * when its data is known to be the data of the target:
 * - a spec of the locale table: the table has the locale identity of the target;
 * - a spec that the converter derives, and the URL reader: the target is this process, and
 *   the form is checked against this process;
 * - the tables of the runtime (case mapping, normalization, collation): the target has the
 *   Unicode and CLDR versions of the tables (`RUNTIME_DATA`).
 */

export interface NodeIdentity {
	/** `process.versions.icu`: the ICU library and its locale data. */
	icu: string;
	/** `process.versions.cldr`: the locale data that ICU holds. */
	cldr: string;
	/** `process.versions.tz`: the time zone rules that ICU holds. */
	tz: string;
	/** `process.versions.unicode`: case mapping, normalization, character properties. */
	unicode: string;
	/** `process.versions.v8`: `Intl`, `toLocaleString` and regular expressions over ICU. */
	v8: string;
	/** `process.versions.ada`: the URL parser. */
	ada: string;
}

/** The versions of the tables that the runtime (`wfrt`) holds: `unicase.zig`, `normalize_tables.zig`, `collate_tables.zig`. */
export const RUNTIME_DATA = { unicode: '17.0', cldr: '48.0' };

const FIELDS = ['icu', 'cldr', 'tz', 'unicode', 'v8', 'ada'] as const;

let ofProcess: NodeIdentity | undefined;

/** The identity of this process. A field that this Node.js does not name is `?`. */
export function processIdentity(): NodeIdentity {
	if (ofProcess) return ofProcess;
	const versions: Record<string, string | undefined> =
		typeof process === 'undefined' ? {} : process.versions;
	const read = (name: string) => versions[name] ?? '?';
	ofProcess = {
		icu: read('icu'),
		cldr: read('cldr'),
		tz: read('tz'),
		unicode: read('unicode'),
		v8: read('v8'),
		ada: read('ada'),
	};
	return ofProcess;
}

let target: NodeIdentity | undefined;

/**
 * Sets the Node.js that runs the workflows on v1. `undefined` is this process. Call it before
 * a conversion when the converter does not run in the n8n process.
 */
export function setTargetNode(identity: NodeIdentity | undefined): void {
	target = identity === undefined ? undefined : { ...identity };
}

export function targetNode(): NodeIdentity {
	return target ?? processIdentity();
}

/** The identity as one text: a part of the cache key of a compiled workflow. */
export function identityKey(identity: NodeIdentity = targetNode()): string {
	return FIELDS.map((name) => `${name}=${identity[name]}`).join(' ');
}

/**
 * True when the target is this process in each field: then a form that the converter checks
 * against this process is a form of the target. A field that is not known (`?`) is no match.
 */
export function targetIsProcess(): boolean {
	const own = processIdentity();
	const wanted = targetNode();
	return FIELDS.every((name) => own[name] !== '?' && own[name] === wanted[name]);
}

/**
 * The part of an identity that decides the text of `Intl` and `toLocaleString`: the locale
 * data and the glue of V8. The time zone rules are no part: a locale spec has no zone.
 */
export function localeIdentity(identity: NodeIdentity = targetNode()): string {
	return `icu=${identity.icu} cldr=${identity.cldr} v8=${identity.v8}`;
}

/**
 * A reason when the tables of the runtime are not those of the target, or null. With a
 * reason no workflow compiles: case mapping, normalization and collation are in each one.
 */
export function runtimeDataMismatch(identity: NodeIdentity = targetNode()): string | null {
	if (identity.unicode !== RUNTIME_DATA.unicode) {
		return `The compiled engine has the case mapping and normalization tables of Unicode ${RUNTIME_DATA.unicode}. This Node.js has Unicode ${identity.unicode}.`;
	}
	if (identity.cldr !== RUNTIME_DATA.cldr) {
		return `The compiled engine has the collation tables of CLDR ${RUNTIME_DATA.cldr}. This Node.js has CLDR ${identity.cldr}.`;
	}
	return null;
}
