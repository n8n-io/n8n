import type {
	WorkflowSetupGroup,
	WorkflowSetupSection,
	WorkflowSetupStep,
} from './workflowSetup.types';

/** Stable section identity used as the key everywhere section state is tracked. */
export function buildSectionId(targetNodeName: string, credentialType?: string): string {
	return `${targetNodeName}:${credentialType ?? 'parameters'}`;
}

/**
 * Returns the parent + sub-node sections in display order. Centralizes the
 * optional-parent handling so callers don't repeat the same spread.
 */
export function getGroupSections(group: WorkflowSetupGroup): WorkflowSetupSection[] {
	return group.parentSection
		? [group.parentSection, ...group.subnodeSections]
		: group.subnodeSections;
}

/** Returns every section a step represents (one for section steps, parent+subnodes for group steps). */
export function getStepSections(step: WorkflowSetupStep): WorkflowSetupSection[] {
	return step.kind === 'group' ? getGroupSections(step.group) : [step.section];
}
