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
	// 'DEFAULT' is n8n's "no error workflow" sentinel (the save path strips it, see
	// removeDefaultValues in packages/cli), and an empty string is falsy at execution
	// time; both behave exactly like an absent setting.
	if (errorWorkflowId === undefined || errorWorkflowId === 'DEFAULT' || errorWorkflowId === '') {
		return [];
	}

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

	let published;
	try {
		published = await context.workflowService.getAsWorkflowJSON(
			errorWorkflowId,
			detail.activeVersionId,
		);
	} catch {
		// Fail closed: accepting the reference here would ship error handling that
		// was never proven to contain an Error Trigger.
		context.logger.warn(
			`[build-workflow] could not inspect published version of error workflow ${errorWorkflowId}`,
		);
		return [
			`Error workflow "${detail.name}" (${errorWorkflowId}) exists and is published, but its published version could not be read to confirm it contains an Error Trigger. Retry the build; if this keeps failing, republish the error workflow and try again.`,
		];
	}

	// The instance may run error workflows with a custom trigger type
	// (GlobalConfig nodes.errorTriggerType), so honor it when provided.
	const errorTriggerType = context.errorTriggerType ?? ERROR_TRIGGER_TYPE;
	const hasErrorTrigger = (published.nodes ?? []).some((node) => node.type === errorTriggerType);
	if (!hasErrorTrigger) {
		return [
			`Error workflow "${detail.name}" (${errorWorkflowId}) has no Error Trigger node in its published version, so it will never fire. ${RECIPE}`,
		];
	}

	return [];
}
