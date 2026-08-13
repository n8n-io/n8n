// Upsert planner: decide, per selected disk case, whether it must be created in the
// lang-tracer suite, updated (content drifted), left unchanged, or skipped (unsupported
// seeding). Pure — no network — so the create/update/unchanged partitioning is
// unit-testable against in-memory suite state.

import type { LangTracerUpdateCaseBody } from './client';
import { normalizeExportedCase } from './normalize';
import { unsupportedPushReason, type LangTracerCreateCaseBody } from './to-exported';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
import { DEFAULT_DATASETS } from '../harness/schema';

export interface PushPlan {
	toCreate: WorkflowTestCaseWithFile[];
	toUpdate: Array<{ id: number; item: WorkflowTestCaseWithFile }>;
	unchanged: WorkflowTestCaseWithFile[];
	skipped: Array<{ fileSlug: string; reason: string }>;
}

/** Disk fields compared to decide create-vs-update. Deliberately EXCLUDES `tags`:
 *  the lang-tracer suite export returns them empty, so a diff on them would fire
 *  on every case; they're still SENT on create so new cases carry them.
 *  `datasets` IS compared — a tier edit must re-sync on push — but the export
 *  omits (or nulls) the stored default, so `projectComparable` folds the default
 *  to absent on both sides to keep re-pushes convergent. */
const COMPARED_KEYS = [
	'description',
	'conversation',
	'complexity',
	'triggerType',
	'processExpectations',
	'outcomeExpectations',
	'messageBudget',
	'credentials',
	'datasets',
	// Round-trips faithfully: PATCH /cases/:id reconciles scenario rows by name
	// (lang-tracer #48) and the export emits them back in disk shape.
	'executionScenarios',
	// Stored at `metadata.seed` and emitted back by the export (lang-tracer #113).
	// Compared so a seed-only edit isn't misread as unchanged and left unpushed.
	'seed',
] as const;

/** Drop the create-only fields, leaving the patchable set (`scenarios` included —
 *  `PATCH /cases/:id` reconciles them by name since lang-tracer #48). An absent
 *  `scenarios` is sent as an explicit `[]` and an absent `seed` as an explicit
 *  `null`: a partial PATCH leaves missing keys untouched, so omitting them would
 *  keep the server's old scenario rows / stored seed alive forever after a disk
 *  case drops its `executionScenarios` / `seed`. Both defaults sit before the
 *  spread, so a case that still has them overrides. */
export function toUpdatePatch({
	suiteId,
	synthetic,
	...patch
}: LangTracerCreateCaseBody): LangTracerUpdateCaseBody {
	return { scenarios: [], seed: null, ...patch };
}

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
	return comparableDiff(existingRaw, diskTestCase).length === 0;
}

/** Which comparable fields differ between an exported body and a disk case. Same
 *  rules as the create/update/unchanged split, so a post-write check can reuse them
 *  to name exactly what a server failed to store. */
export function comparableDiff(existingRaw: unknown, diskTestCase: unknown): string[] {
	const existing = projectComparable(normalizeExportedCase(existingRaw));
	const disk = projectComparable(diskTestCase);
	return COMPARED_KEYS.filter((key) => canonicalize(existing[key]) !== canonicalize(disk[key]));
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
		// The loader defaults an absent disk `datasets` while the export omits (or
		// nulls) the stored default — fold the default to absent on both sides, and
		// compare order-insensitively since tiers are a set.
		if (key === 'datasets') {
			if (!Array.isArray(value)) continue;
			const datasets = value.slice().sort();
			if (canonicalize(datasets) === canonicalize([...DEFAULT_DATASETS].sort())) continue;
			out[key] = datasets;
			continue;
		}
		// Shorthand expansion stamps a fresh `randomUUID()` per parse, so comparing
		// message ids can never converge — the case would re-PATCH on every push
		// forever. Ids carry no meaning to a case, so they're dropped here.
		// `createdAt` is NOT dropped: restore ordering depends on it, so an authored
		// envelope's timestamp edit must still register. Shorthand's own timestamps
		// are deterministic (see SHORTHAND_SEED_EPOCH_MS), so they converge anyway.
		if (key === 'seed') {
			out[key] = seedWithoutMessageIds(value);
			continue;
		}
		out[key] = value;
	}
	return out;
}

/** Drop message `id`s from a seed before comparing: shorthand expansion mints a
 *  new one per parse, so keeping them would make a shorthand-authored case differ
 *  from its stored export forever. Everything else the author wrote — role,
 *  content, `createdAt`, workflows, data tables — still compares. */
function seedWithoutMessageIds(value: unknown): unknown {
	if (value === null || typeof value !== 'object') return value;
	const seed: Record<string, unknown> = { ...(value as Record<string, unknown>) };
	const messages: unknown = seed.messages;
	if (!Array.isArray(messages)) return seed;
	seed.messages = (messages as unknown[]).map((message) => {
		if (message === null || typeof message !== 'object') return message;
		const { id, ...rest } = message as Record<string, unknown>;
		return rest;
	});
	return seed;
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
