import {
	FORM_TRIGGER_NODE_TYPE,
	type IRunExecutionData,
	type WebhookResponseMode,
} from 'n8n-workflow';

import type { WebhookExecutionContext } from './webhook-execution-context';

/** Use the trigger that ran when multiple form triggers lead to the same page. */
export function getFormTriggerResponseMode(
	context: WebhookExecutionContext,
	runExecutionData: IRunExecutionData | undefined,
): WebhookResponseMode | undefined {
	if (!runExecutionData) return undefined;

	const { workflow, workflowStartNode, executionMode, additionalKeys } = context;
	const trigger = workflow
		.getParentNodes(workflowStartNode.name)
		.map((name) => workflow.nodes[name])
		.find(
			(node) =>
				node.type === FORM_TRIGGER_NODE_TYPE &&
				!node.disabled &&
				!!runExecutionData.resultData.runData[node.name]?.length,
		);
	if (!trigger) return undefined;

	const savedMode = trigger.parameters.responseMode ?? 'onReceived';
	if (typeof savedMode !== 'string') return undefined;

	const responseMode = workflow.expression.getSimpleParameterValue(
		trigger,
		savedMode,
		executionMode,
		additionalKeys,
	);

	if (
		responseMode === 'onReceived' ||
		responseMode === 'lastNode' ||
		responseMode === 'responseNode'
	) {
		return responseMode;
	}
	return undefined;
}
