import type { BreakingChangeVersion } from '@n8n/api-types';

import type { MigrationFinding } from '../database/entities/migration-finding.entity';
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
	hits: MigrationFindingHit[];
	existing: MigrationFinding[];
}

/** Row ids to update, plus the findings to create. */
export interface MigrationFindingDiff {
	toInsert: NewMigrationFinding[];
	toMarkFixed: number[];
	toReopen: number[];
}

// The null character separates the two ids. It cannot appear in either id, so
// two different pairs can never produce the same key. A visible separator such
// as `:` would collide if a rule id ever contained it.
const hitKey = (ruleId: string, workflowId: string) => `${ruleId}\u0000${workflowId}`;

/**
 * Compares the scan hits for one batch of workflows with the stored findings.
 * Only `open` and `fixed` rows take part. Rows in any other status stay as
 * they are.
 * TODO(CAT-4710): handle `notified` and `wont_fix` rows once triage can set them.
 */
export function diffMigrationFindings(input: MigrationFindingDiffInput): MigrationFindingDiff {
	const { targetVersion, hits, existing } = input;
	const batchWorkflowIds = new Set(input.workflowIds);

	const hitKeys = new Set<string>();
	for (const hit of hits) {
		if (batchWorkflowIds.has(hit.workflowId)) hitKeys.add(hitKey(hit.ruleId, hit.workflowId));
	}

	const diff: MigrationFindingDiff = { toInsert: [], toMarkFixed: [], toReopen: [] };
	const seenKeys = new Set<string>();

	for (const row of existing) {
		if (!batchWorkflowIds.has(row.workflowId)) continue;

		const key = hitKey(row.ruleId, row.workflowId);
		seenKeys.add(key);
		const isHit = hitKeys.has(key);

		if (row.status === 'open' && !isHit) diff.toMarkFixed.push(row.id);
		if (row.status === 'fixed' && isHit) diff.toReopen.push(row.id);
	}

	for (const hit of hits) {
		const key = hitKey(hit.ruleId, hit.workflowId);
		if (!hitKeys.has(key) || seenKeys.has(key)) continue;

		seenKeys.add(key);
		diff.toInsert.push({ targetVersion, ruleId: hit.ruleId, workflowId: hit.workflowId });
	}

	return diff;
}
