import type { InstanceAiWorkflowTestsHandoffContext } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { UserError } from '@n8n/errors';

import {
	sanitisePromptText,
	WORKFLOW_TESTS_CONTEXT_CLOSE_TAG,
	WORKFLOW_TESTS_CONTEXT_OPEN_TAG,
} from './internal-messages';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

/** Checks the hand-off from the Tests tab and returns the workflow it names. */
export async function resolveWorkflowTestsHandoff(
	context: InstanceAiWorkflowTestsHandoffContext,
	user: User,
): Promise<{ id: string; name: string }> {
	if (!Container.get(ModuleRegistry).isActive('workflow-tests')) {
		throw new UserError('Workflow tests are not available on this instance');
	}
	const workflow = await Container.get(WorkflowFinderService).findWorkflowForUser(
		context.workflowId,
		user,
		['workflow:read'],
	);
	if (!workflow) {
		throw new UserError('Workflow not found, or you do not have access to it');
	}
	return { id: workflow.id, name: workflow.name };
}

/**
 * The opening-turn block of a Tests tab hand-off: the workflow and the
 * `workflow-tests` skill, so the work starts without a `load_skill` call.
 */
export function buildWorkflowTestsContextBlock(
	workflow: { id: string; name: string },
	skillInstructions: string,
): string {
	return [
		WORKFLOW_TESTS_CONTEXT_OPEN_TAG,
		`The user opened this conversation from the Tests tab of the workflow "${sanitisePromptText(workflow.name)}" (id \`${sanitisePromptText(workflow.id)}\`).`,
		'Work on the test file of this workflow with the workflow-tests tool. Do not change the workflow itself.',
		'The workflow-tests skill below is loaded for this thread: follow it and do not call load_skill for it.',
		'',
		'<workflow-tests-skill>',
		skillInstructions.trim(),
		'</workflow-tests-skill>',
		WORKFLOW_TESTS_CONTEXT_CLOSE_TAG,
	].join('\n');
}
