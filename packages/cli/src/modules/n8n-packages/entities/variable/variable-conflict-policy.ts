import type { VariableConflict, VariableImportPlan } from './variable.types';
import { VariableConflictPolicy } from '../../n8n-packages.types';

/** What a policy does about a matched variable the package bundles a different value for. */
type ConflictEffect =
	| { usesPackageValue: false; overwrites: false; blocks: false }
	| { usesPackageValue: true; overwrites: boolean; blocks: boolean };

const ON_VARIABLE_CONFLICT: Record<VariableConflictPolicy, ConflictEffect> = {
	[VariableConflictPolicy.KeepExisting]: {
		usesPackageValue: false,
		overwrites: false,
		blocks: false,
	},
	[VariableConflictPolicy.Overwrite]: { usesPackageValue: true, overwrites: true, blocks: false },
	[VariableConflictPolicy.Fail]: { usesPackageValue: true, overwrites: false, blocks: true },
};

/** Whether the policy compares the package's exported value against the matched variable's. */
export function variableConflictPolicyUsesPackageValue(policy: VariableConflictPolicy): boolean {
	return ON_VARIABLE_CONFLICT[policy].usesPackageValue;
}

/** Whether the policy replaces the matched variable's value with the package's. */
export function variableConflictPolicyOverwrites(policy: VariableConflictPolicy): boolean {
	return ON_VARIABLE_CONFLICT[policy].overwrites;
}

/** Which conflicts block the import under the chosen conflict policy. */
export function variableConflictBlockingFailures(
	policy: VariableConflictPolicy,
	plan: VariableImportPlan,
): VariableConflict[] {
	return ON_VARIABLE_CONFLICT[policy].blocks ? plan.conflicts : [];
}
