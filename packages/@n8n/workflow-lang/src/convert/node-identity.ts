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
	/**
	 * The time zone of the n8n process: `Date` in an expression and in a node gives local time
	 * in it. `?` when it is not known.
	 */
	zone?: string;
	/**
	 * The time zone of the task runner process: `Date` in a Code node gives local time in it.
	 * n8n starts the runner without `TZ`, so it is the zone of the operating system, not the
	 * `TZ` of the n8n process and not `GENERIC_TIMEZONE`. `?` when it is not known.
	 */
	runnerZone?: string;
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
	return target ?? { ...processIdentity(), zone: processZone(), runnerZone: runnerZone() };
}

/** The identity as one text: a part of the cache key of a compiled workflow. */
export function identityKey(identity: NodeIdentity = targetNode()): string {
	const zones = `zone=${identity.zone ?? '?'} runnerZone=${identity.runnerZone ?? '?'}`;
	return `${FIELDS.map((name) => `${name}=${identity[name]}`).join(' ')} ${zones}`;
}

/** The names of the time zone that is UTC all year, as `Intl` gives them. */
const UTC_ZONES = new Set([
	'UTC',
	'Etc/UTC',
	'GMT',
	'Etc/GMT',
	'UCT',
	'Etc/UCT',
	'Zulu',
	'Etc/Zulu',
]);

/** The zone of this process: `TZ`, or the zone of the operating system. It is not kept: `TZ` can change. */
function processZone(): string {
	try {
		return new Intl.DateTimeFormat().resolvedOptions().timeZone || '?';
	} catch {
		return '?';
	}
}

let declaredRunnerZone: string | undefined;

/**
 * Declares the time zone of the task runner process, for a converter that knows it: a test
 * that starts its runner with `TZ`, or a deployment with external runners. `undefined` takes
 * the declaration away.
 */
export function setRunnerZone(zone: string | undefined): void {
	declaredRunnerZone = zone;
}

/**
 * The zone of the task runner that the n8n of this process starts. n8n gives the runner no
 * `TZ`, so the runner has the zone of the operating system. This process has the same zone
 * only when it has no `TZ` itself. With `TZ`, and with external runners, the zone is not
 * known unless `setRunnerZone` or `WF_TARGET_RUNNER_ZONE` declares it.
 */
function runnerZone(): string {
	if (declaredRunnerZone !== undefined) return declaredRunnerZone;
	const env: Record<string, string | undefined> = typeof process === 'undefined' ? {} : process.env;
	if (env.WF_TARGET_RUNNER_ZONE) return env.WF_TARGET_RUNNER_ZONE;
	if (env.N8N_RUNNERS_MODE === 'external' || env.TZ) return '?';
	return processZone();
}

/**
 * True when local time of `Date` is UTC for certain in the process that runs the code on v1:
 * the task runner for a Code node (`runner`), the n8n process for an expression or a node
 * (`process`). The runtime gives local time in UTC only, so each other zone, and a zone that
 * is not known, keeps the local time forms in the host.
 */
export function localTimeIsUtc(consumer: 'process' | 'runner'): boolean {
	const identity = targetNode();
	const zone = consumer === 'runner' ? identity.runnerZone : identity.zone;
	return zone !== undefined && UTC_ZONES.has(zone);
}

/**
 * True when the target is this process in each field: then a form that the converter checks
 * against this process is a form of the target. A field that is not known (`?`) is no match.
 */
export function targetIsProcess(): boolean {
	const own = processIdentity();
	// The zones are no part of this comparison: do not read them (`Intl` is slow in a hot path).
	const wanted = target ?? own;
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
