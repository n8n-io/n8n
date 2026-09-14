import type { DataTable } from '@/modules/data-table/data-table.entity';

import type { DataTableMatchingMode } from '../../n8n-packages.types';
import type { PackageDataTableRequirement } from '../../spec/requirements.schema';

/**
 * Lookup structures prefetched by the caller that matching modes draw on.
 * `targetsById` is global (instance-wide) because it also serves the
 * id-conflict guard on planned creations; matching scopes it to the project.
 */
export interface MatchCandidates {
	projectId: string;
	targetsById: ReadonlyMap<string, DataTable>;
}

/**
 * Finds the target-project table a requirement matches, or undefined when
 * absent. `by-id` matches on the same id within the target project and never
 * falls back to name matching.
 */
/* eslint-disable @typescript-eslint/naming-convention -- API data table matching mode keys */
const MATCH_TARGET_TABLE: Record<
	DataTableMatchingMode,
	(requirement: PackageDataTableRequirement, candidates: MatchCandidates) => DataTable | undefined
> = {
	'by-id': ({ id }, { targetsById, projectId }) => {
		const table = targetsById.get(id);
		return table && table.projectId === projectId ? table : undefined;
	},
};
/* eslint-enable @typescript-eslint/naming-convention */

export function matchTargetTable(
	mode: DataTableMatchingMode,
	requirement: PackageDataTableRequirement,
	candidates: MatchCandidates,
): DataTable | undefined {
	return MATCH_TARGET_TABLE[mode](requirement, candidates);
}
