import type { VariableImportPlan, VariableResolutionFailure } from './variable.types';
import { VariableMissingMode } from '../../n8n-packages.types';

/** What a mode does about an unresolved requirement: creating it cannot block, and only creating can use its value. */
type MissingVariableEffect =
	| { creates: false; usesPackageValue: false; blocks: boolean }
	| { creates: true; usesPackageValue: boolean; blocks: false };

const ON_MISSING_VARIABLE: Record<VariableMissingMode, MissingVariableEffect> = {
	[VariableMissingMode.DoNothing]: { creates: false, usesPackageValue: false, blocks: false },
	[VariableMissingMode.MustPreexist]: { creates: false, usesPackageValue: false, blocks: true },
	[VariableMissingMode.CreateStub]: { creates: true, usesPackageValue: false, blocks: false },
	[VariableMissingMode.CreateWithValue]: { creates: true, usesPackageValue: true, blocks: false },
};

/** Whether the mode fills an unresolved requirement by creating the variable. */
export function variableMissingModeCreates(mode: VariableMissingMode): boolean {
	return ON_MISSING_VARIABLE[mode].creates;
}

/** Whether the mode creates with the package's exported value rather than an empty stub. */
export function variableMissingModeUsesPackageValue(mode: VariableMissingMode): boolean {
	return ON_MISSING_VARIABLE[mode].usesPackageValue;
}

/** Which unresolved requirements block the import under the chosen missing mode. */
export function variableBlockingFailures(
	mode: VariableMissingMode,
	plan: VariableImportPlan,
): VariableResolutionFailure[] {
	return ON_MISSING_VARIABLE[mode].blocks ? plan.missing : [];
}
