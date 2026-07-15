// Pure, side-effect-free logic for the co-review cockpit, split out from
// server.ts so it can be unit-tested without booting the HTTP server or a live
// n8n instance.

import type { WorkflowTestCaseResult } from '../types';

/** Default port the cockpit HTTP server listens on. */
export const DEFAULT_COCKPIT_PORT = 5679;

/**
 * Build the `Set-Cookie` value that primes the browser with the instance's auth
 * session so the embedded builder iframe is already logged in. Browser cookies
 * are NOT port-scoped (RFC 6265), so a host-only cookie the cockpit sets on
 * localhost is sent to the instance's iframe on a different localhost port.
 * Takes the bare `n8n-auth=<jwt>` the N8nClient captured at login and keeps only
 * the `name=value` pair, appending browser-scoped attributes.
 */
export function browserAuthCookie(sessionCookie: string): string {
	const nameValue = sessionCookie.split(';')[0].trim();
	return `${nameValue}; Path=/; SameSite=Lax`;
}

/**
 * The Instance AI URL the builder iframe should load for a case: its built
 * thread (`/assistant/:threadId`) once a build has produced one, else the empty
 * builder (`/assistant`). Deep-linking to the thread means selecting a case shows
 * the conversation that case actually ran, not a blank builder.
 */
export function instanceAiThreadUrl(baseUrl: string, threadId?: string): string {
	const base = `${baseUrl.replace(/\/$/, '')}/assistant`;
	return threadId ? `${base}/${encodeURIComponent(threadId)}` : base;
}

/** Cockpit-only flags extracted before handing the rest to parseCliArgs (which
 *  rejects unknown flags): `--port <n>` and the boolean `--run-all`. */
export function extractCockpitFlags(argv: string[]): {
	port: number;
	runAll: boolean;
	rest: string[];
} {
	const rest: string[] = [];
	let port = DEFAULT_COCKPIT_PORT;
	let runAll = false;
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--port') {
			const parsed = Number.parseInt(argv[i + 1] ?? '', 10);
			if (Number.isFinite(parsed) && parsed > 0) {
				port = parsed;
			}
			i++; // skip the value
			continue;
		}
		if (argv[i] === '--run-all') {
			runAll = true;
			continue;
		}
		rest.push(argv[i]);
	}
	return { port, runAll, rest };
}

/** Calibration categories that get a scannable prefix in the case description
 *  (mirrors the "A red is signal" convention in the skill's SKILL.md). */
export type CalibrationCategory = 'harness' | 'capability-gap';

const CALIBRATION_PREFIX: Record<CalibrationCategory, string> = {
	harness: 'Harness note:',
	'capability-gap': 'Capability-gap finding:',
};

/**
 * Append a calibration verdict to a case's `description`, prefixed so the corpus
 * stays greppable. Creates the description if there wasn't one.
 */
export function appendCalibrationNote(
	description: string | undefined,
	category: CalibrationCategory,
	note: string,
): string {
	const line = `${CALIBRATION_PREFIX[category]} ${note}`;
	return description && description.length > 0 ? `${description}\n\n${line}` : line;
}

/** Coarse per-case lifecycle status shown in the cockpit's case list. */
export type CaseStatus = 'idle' | 'queued' | 'building' | 'grading' | 'done' | 'error';

/** Statuses that mean a build is in flight — a case in one of these must not be
 *  dispatched again. */
const IN_FLIGHT: ReadonlySet<CaseStatus> = new Set<CaseStatus>(['queued', 'building', 'grading']);

interface RegistryEntry {
	slug: string;
	status: CaseStatus;
	result?: WorkflowTestCaseResult;
	error?: string;
}

/**
 * In-memory record of each loaded case's run status. The cockpit's case-list
 * rail polls `snapshot()`; `claim()` guards against dispatching a case whose
 * build is already in flight.
 */
export class RunRegistry {
	private readonly entries = new Map<string, RegistryEntry>();

	constructor(slugs: string[]) {
		for (const slug of slugs) {
			this.entries.set(slug, { slug, status: 'idle' });
		}
	}

	get(slug: string): RegistryEntry {
		const entry = this.entries.get(slug);
		if (!entry) {
			throw new Error(`RunRegistry: unknown slug "${slug}"`);
		}
		return entry;
	}

	/** Whether a build is already in flight for this case (read-only). */
	isInFlight(slug: string): boolean {
		return IN_FLIGHT.has(this.get(slug).status);
	}

	/** Reserve a case for a run. Returns false (no state change) if a build is
	 *  already in flight for it, so overlapping run requests never double-dispatch. */
	claim(slug: string): boolean {
		if (this.isInFlight(slug)) {
			return false;
		}
		const entry = this.get(slug);
		entry.status = 'building';
		entry.error = undefined;
		return true;
	}

	setStatus(slug: string, status: CaseStatus): void {
		this.get(slug).status = status;
	}

	finish(slug: string, result: WorkflowTestCaseResult): void {
		const entry = this.get(slug);
		entry.status = 'done';
		entry.result = result;
	}

	fail(slug: string, error: string): void {
		const entry = this.get(slug);
		entry.status = 'error';
		entry.error = error;
	}

	snapshot(): RegistryEntry[] {
		return [...this.entries.values()].map((e) => ({
			slug: e.slug,
			status: e.status,
			...(e.error !== undefined ? { error: e.error } : {}),
		}));
	}
}
