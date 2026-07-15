// Pure, side-effect-free logic for the co-review cockpit, split out from
// server.ts so it can be unit-tested without booting the HTTP server or a live
// n8n instance.

import type { WorkflowTestCaseResult } from '../types';

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
