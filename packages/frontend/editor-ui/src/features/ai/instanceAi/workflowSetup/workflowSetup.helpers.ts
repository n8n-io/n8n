import {
	isWorkflowSetupGroupStep,
	type WorkflowSetupGroup,
	type WorkflowSetupSection,
	type WorkflowSetupStep,
} from './workflowSetup.types';

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
	if (isWorkflowSetupGroupStep(step)) {
		return getGroupSections(step.group);
	}
	return step.section ? [step.section] : [];
}
