import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../types';

const ERROR_TRIGGER_TYPE = 'n8n-nodes-base.errorTrigger';

const RECIPE =
	'settings.errorWorkflow must be the real workflow ID of a separate published workflow whose published version contains an Error Trigger node. ' +
	'Build the error workflow, publish it with workflows(action="publish"), then set its returned ID here.';

/**
 * Referential check for `settings.errorWorkflow`: n8n silently never fires an
 * error workflow whose ID does not resolve to a published workflow with an
 * Error Trigger, so an invalid reference must fail the build instead of
 * shipping a workflow whose error handling is dead.
 */
export async function validateErrorWorkflowReference(
	json: WorkflowJSON,
	context: InstanceAiContext,
): Promise<string[]> {
	const errorWorkflowId = json.settings?.errorWorkflow;
	if (errorWorkflowId === undefined) return [];

	if (
		typeof errorWorkflowId !== 'string' ||
		errorWorkflowId.trim() === '' ||
		errorWorkflowId.includes('{{') ||
		errorWorkflowId.includes('__PLACEHOLDER')
	) {
		return [
			`settings.errorWorkflow is not a concrete workflow ID (got ${JSON.stringify(errorWorkflowId)}). Names, placeholders and expressions are not supported. ${RECIPE}`,
		];
	}

	let detail;
	try {
		detail = await context.workflowService.get(errorWorkflowId);
	} catch {
		return [
			`settings.errorWorkflow "${errorWorkflowId}" could not be resolved to an existing workflow (it may not exist, or the lookup failed). Never use a local SDK workflow id here. ${RECIPE}`,
		];
	}

	if (!detail.activeVersionId) {
		return [
			`Error workflow "${detail.name}" (${errorWorkflowId}) is not published. settings.errorWorkflow only fires for a published workflow. ${RECIPE}`,
		];
	}

	try {
		const published = await context.workflowService.getAsWorkflowJSON(
			errorWorkflowId,
			detail.activeVersionId,
		);
		const hasErrorTrigger = (published.nodes ?? []).some(
			(node) => node.type === ERROR_TRIGGER_TYPE,
		);
		if (!hasErrorTrigger) {
			return [
				`Error workflow "${detail.name}" (${errorWorkflowId}) has no Error Trigger node in its published version, so it will never fire. ${RECIPE}`,
			];
		}
	} catch {
		// Published-version fetch failed after the workflow itself resolved:
		// don't block the save on a read hiccup for a secondary check.
		context.logger.debug(
			`[build-workflow] could not inspect published version of error workflow ${errorWorkflowId}; skipping Error Trigger check`,
		);
	}

	return [];
}
