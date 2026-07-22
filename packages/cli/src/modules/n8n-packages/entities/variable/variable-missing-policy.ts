import type { VariableImportPlan, VariableResolutionFailure } from './variable.types';
import { VariableMissingPolicy } from '../../n8n-packages.types';

/** Classifies which unresolved variable requirements block the import, per missing policy. */
const BLOCKING_FAILURES: Record<
	VariableMissingPolicy,
	(plan: VariableImportPlan) => VariableResolutionFailure[]
> = {
	[VariableMissingPolicy.DoNothing]: () => [],
	[VariableMissingPolicy.MustPreexist]: (plan) => plan.missing,
};

export function variableBlockingFailures(
	policy: VariableMissingPolicy,
	plan: VariableImportPlan,
): VariableResolutionFailure[] {
	return BLOCKING_FAILURES[policy](plan);
}
