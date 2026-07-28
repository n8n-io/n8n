import type { VariableImportPlan, VariableResolutionFailure } from './variable.types';
import { VariableMissingMode } from '../../n8n-packages.types';

/** What a mode does about an unresolved requirement; one that creates the variable cannot block. */
type MissingVariableEffect = { creates: false; blocks: boolean } | { creates: true; blocks: false };

const ON_MISSING_VARIABLE: Record<VariableMissingMode, MissingVariableEffect> = {
	[VariableMissingMode.DoNothing]: { creates: false, blocks: false },
	[VariableMissingMode.MustPreexist]: { creates: false, blocks: true },
	[VariableMissingMode.CreateStub]: { creates: true, blocks: false },
};

/** Whether the mode fills an unresolved requirement by creating the variable. */
export function variableMissingModeCreates(mode: VariableMissingMode): boolean {
	return ON_MISSING_VARIABLE[mode].creates;
}

/** Which unresolved requirements block the import under the chosen missing mode. */
export function variableBlockingFailures(
	mode: VariableMissingMode,
	plan: VariableImportPlan,
): VariableResolutionFailure[] {
	return ON_MISSING_VARIABLE[mode].blocks ? plan.missing : [];
}
