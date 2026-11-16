import type { BreakingChangeVersion, MigrationFindingStatus } from '@n8n/api-types';

import type {
	MigrationFinding,
	MigrationFindingId,
} from '../database/entities/migration-finding.entity';
import type { NewMigrationFinding } from '../database/repositories/migration-finding.repository';

/** One rule that fired on one workflow during a scan. */
export interface MigrationFindingHit {
	ruleId: string;
	workflowId: string;
}

export interface MigrationFindingDiffInput {
	targetVersion: BreakingChangeVersion;
	/** The workflows in this batch. Hits and rows for other workflows are ignored. */
	workflowIds: string[];
	/** Hits in the latest version of each workflow. */
	hits: MigrationFindingHit[];
	/**
	 * Hits in the published version, for workflows whose latest version is ahead of
	 * it. A workflow absent here has nothing published, or the same version published.
	 */
	publishedHits?: MigrationFindingHit[];
	existing: MigrationFinding[];
	/**
	 * Pairs this run did not decide: the rule check threw, or the rule is out of
	 * scope for this run (a batch rule on a single-workflow re-check).
	 */
	unknown?: MigrationFindingHit[];
}

/** Findings to create, plus the ids of stored findings to update. */
export interface MigrationFindingDiff {
	toInsert: NewMigrationFinding[];
	toMarkFixed: MigrationFindingId[];
	toMarkFixedUnpublished: MigrationFindingId[];
	toReopen: MigrationFindingId[];
}

// The null character separates the two ids. It cannot appear in either id, so
// two different pairs can never produce the same key. A visible separator such
// as `:` would collide if a rule id ever contained it.
const hitKey = (ruleId: string, workflowId: string) => `${ruleId}\u0000${workflowId}`;

/**
 * Compares the scan hits for one batch of workflows with the stored findings.
 * A hit in the latest version means the finding is open: a new pair is inserted,
 * and a `fixed` or `fixed_unpublished` row is reopened. Without that hit, the
 * finding is `fixed_unpublished` while the published version still has the hit,
 * and `fixed` otherwise. A `wont_fix` row stays as it is while the published
 * version has the hit, and becomes `fixed` once no version has it, so a won't
 * fix choice does not outlive the issue. A pair that only the published version
 * hits is inserted as `fixed_unpublished`. A pair listed in `unknown` is never
 * inserted or changed: a missing hit there means the pair was not decided, not
 * that the workflow is clean. The other rules on the same workflow are handled as usual.
 */
const RESOLVED_STATUSES = new Set<MigrationFindingStatus>(['fixed', 'fixed_unpublished']);

export function diffMigrationFindings(input: MigrationFindingDiffInput): MigrationFindingDiff {
	const { targetVersion, hits, publishedHits = [], existing, unknown = [] } = input;
	const batchWorkflowIds = new Set(input.workflowIds);

	const unknownKeys = new Set(unknown.map((pair) => hitKey(pair.ruleId, pair.workflowId)));

	const keysInBatch = (pairs: MigrationFindingHit[]) =>
		new Set(
			pairs
				.filter((pair) => batchWorkflowIds.has(pair.workflowId))
				.map((pair) => hitKey(pair.ruleId, pair.workflowId)),
		);
	const hitKeys = keysInBatch(hits);
	const publishedHitKeys = keysInBatch(publishedHits);

	const diff: MigrationFindingDiff = {
		toInsert: [],
		toMarkFixed: [],
		toMarkFixedUnpublished: [],
		toReopen: [],
	};
	const seenKeys = new Set<string>();

	for (const row of existing) {
		if (!batchWorkflowIds.has(row.workflowId)) continue;

		const key = hitKey(row.ruleId, row.workflowId);
		seenKeys.add(key);
		if (unknownKeys.has(key)) continue;

		if (hitKeys.has(key)) {
			if (RESOLVED_STATUSES.has(row.status)) diff.toReopen.push(row.id);
		} else if (publishedHitKeys.has(key)) {
			if (row.status !== 'fixed_unpublished' && row.status !== 'wont_fix') {
				diff.toMarkFixedUnpublished.push(row.id);
			}
		} else if (row.status !== 'fixed') {
			diff.toMarkFixed.push(row.id);
		}
	}

	for (const hit of [...hits, ...publishedHits]) {
		const key = hitKey(hit.ruleId, hit.workflowId);
		if (!batchWorkflowIds.has(hit.workflowId) || seenKeys.has(key) || unknownKeys.has(key)) {
			continue;
		}

		seenKeys.add(key);
		diff.toInsert.push({
			targetVersion,
			ruleId: hit.ruleId,
			workflowId: hit.workflowId,
			status: hitKeys.has(key) ? 'open' : 'fixed_unpublished',
		});
	}

	return diff;
}
