import type { DataTableResolutionFailure } from './data-table.types';
import type { DataTableMissingMode } from '../../n8n-packages.types';
import type { PackageDataTableRequirement } from '../../spec/requirements.schema';

export type AbsentTableEffect =
	| { action: 'create' }
	| { action: 'skip' }
	| { action: 'fail'; failure: DataTableResolutionFailure };

/**
 * Decides what happens to a package table that has no match in the target
 * project. Only governs absence — matched tables are always compat-checked,
 * so `do-nothing` never mutes a schema failure.
 */
/* eslint-disable @typescript-eslint/naming-convention -- API data table missing mode keys */
const ON_ABSENT_TABLE: Record<
	DataTableMissingMode,
	(requirement: PackageDataTableRequirement) => AbsentTableEffect
> = {
	create: () => ({ action: 'create' }),
	'must-preexist': (requirement) => ({
		action: 'fail',
		failure: {
			kind: 'missing',
			sourceId: requirement.id,
			name: requirement.name,
			usedByWorkflows: [...requirement.usedByWorkflows].sort(),
		},
	}),
	'do-nothing': () => ({ action: 'skip' }),
};
/* eslint-enable @typescript-eslint/naming-convention */

export function decideAbsentTable(
	mode: DataTableMissingMode,
	requirement: PackageDataTableRequirement,
): AbsentTableEffect {
	return ON_ABSENT_TABLE[mode](requirement);
}
