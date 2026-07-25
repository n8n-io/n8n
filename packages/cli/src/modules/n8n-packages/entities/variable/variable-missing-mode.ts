import type { VariableImportPlan, VariableResolutionFailure } from './variable.types';
import { VariableMissingMode } from '../../n8n-packages.types';

/** Classifies which unresolved variable requirements block the import, per missing mode. */
const BLOCKING_FAILURES: Record<
	VariableMissingMode,
	(plan: VariableImportPlan) => VariableResolutionFailure[]
> = {
	[VariableMissingMode.DoNothing]: () => [],
	[VariableMissingMode.MustPreexist]: (plan) => plan.missing,
};

export function variableBlockingFailures(
	mode: VariableMissingMode,
	plan: VariableImportPlan,
): VariableResolutionFailure[] {
	return BLOCKING_FAILURES[mode](plan);
}
