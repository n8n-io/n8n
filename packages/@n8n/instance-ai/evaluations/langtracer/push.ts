// Upsert planner: decide, per selected disk case, whether it must be created in the
// lang-tracer suite, updated (content drifted), left unchanged, or skipped (unsupported
// seeding). Pure — no network — so the create/update/unchanged partitioning is
// unit-testable against in-memory suite state.

import { normalizeExportedCase } from './normalize';
import { unsupportedPushReason } from './to-exported';
import type { WorkflowTestCaseWithFile } from '../data/workflows';

export interface PushPlan {
	toCreate: WorkflowTestCaseWithFile[];
	toUpdate: Array<{ id: number; item: WorkflowTestCaseWithFile }>;
	unchanged: WorkflowTestCaseWithFile[];
	skipped: Array<{ fileSlug: string; reason: string }>;
}

/** Disk fields compared to decide create-vs-update. Deliberately EXCLUDES three
 *  fields that would make a re-push never converge (always "update"):
 *  - `executionScenarios`: sidecar rows `PATCH /cases/:id` can't update — written on create only.
 *  - `tags` and `datasets`: the lang-tracer suite export does not round-trip these
 *    (tags come back empty, default `datasets` comes back null/omitted), so a diff
 *    on them always fires. They're still SENT on create so new cases carry them;
 *    edits to only tags/tier on an existing case aren't re-synced. */
const COMPARED_KEYS = [
	'description',
	'conversation',
	'complexity',
	'triggerType',
	'processExpectations',
	'outcomeExpectations',
	'messageBudget',
	'credentials',
] as const;

/** `existingBodies`: `<name>.json` → exported (disk-shape) body from `GET /suites/:id/export`.
 *  `existingIdsByName`: case name → id from `GET /suites/:id` (authoritative membership). */
export function planPush(
	selected: WorkflowTestCaseWithFile[],
	existingBodies: Record<string, unknown>,
	existingIdsByName: Record<string, number>,
): PushPlan {
	const plan: PushPlan = { toCreate: [], toUpdate: [], unchanged: [], skipped: [] };

	for (const item of selected) {
		const reason = unsupportedPushReason(item.testCase);
		if (reason) {
			plan.skipped.push({ fileSlug: item.fileSlug, reason });
			continue;
		}

		const id = existingIdsByName[item.fileSlug];
		if (id === undefined) {
			plan.toCreate.push(item);
			continue;
		}

		const existing = existingBodies[`${item.fileSlug}.json`];
		if (existing !== undefined && sameComparableFields(existing, item.testCase)) {
			plan.unchanged.push(item);
		} else {
			plan.toUpdate.push({ id, item });
		}
	}

	return plan;
}

/** Compare only the PATCH-able disk fields of an exported body against a disk case,
 *  after folding lang-tracer's export-only keys / legacy `buildExpectations`. */
function sameComparableFields(existingRaw: unknown, diskTestCase: unknown): boolean {
	const existing = projectComparable(normalizeExportedCase(existingRaw));
	const disk = projectComparable(diskTestCase);
	return canonicalize(existing) === canonicalize(disk);
}

function projectComparable(src: unknown): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	if (src === null || typeof src !== 'object') return out;
	const obj = src as Record<string, unknown>;
	const conversation = obj.conversation;
	const isMultiTurn = Array.isArray(conversation) && conversation.length > 1;
	for (const key of COMPARED_KEYS) {
		const value = obj[key];
		if (value === undefined) continue;
		// Treat an empty array the same as absent, so `[]` on one side and a missing
		// key on the other don't register as a spurious change.
		if (Array.isArray(value) && value.length === 0) continue;
		// The export only emits `messageBudget` for multi-turn cases (it's ignored for
		// single-turn auto-approve builds), so ignore it there to stay convergent.
		if (key === 'messageBudget' && !isMultiTurn) continue;
		out[key] = value;
	}
	return out;
}

/** Stable JSON with sorted object keys, so field/scenario ordering never affects equality. */
function canonicalize(value: unknown): string {
	return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortKeysDeep);
	if (value !== null && typeof value === 'object') {
		const sorted: Record<string, unknown> = {};
		for (const key of Object.keys(value as Record<string, unknown>).sort()) {
			sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
		}
		return sorted;
	}
	return value;
}
