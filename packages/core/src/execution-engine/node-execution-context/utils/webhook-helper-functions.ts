import type {
	WebhookType,
	Workflow,
	INode,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
	IWorkflowDataProxyAdditionalKeys,
	IWebhookDescription,
} from 'n8n-workflow';
import { NodeHelpers, resolveWebhookDescriptionField } from 'n8n-workflow';

/** Returns the full webhook description of the webhook with the given name */
export function getWebhookDescription(
	name: WebhookType,
	workflow: Workflow,
	node: INode,
): IWebhookDescription | undefined {
	const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

	// Node does not have any webhooks so return
	if (nodeType.description.webhooks === undefined) return;

	for (const webhookDescription of nodeType.description.webhooks) {
		if (webhookDescription.name === name) {
			return webhookDescription;
		}
	}

	return undefined;
}

/** Returns the webhook URL of the webhook with the given name */
export function getNodeWebhookUrl(
	name: WebhookType,
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	additionalKeys: IWorkflowDataProxyAdditionalKeys,
	isTest?: boolean,
): string | undefined {
	const webhookDescription = getWebhookDescription(name, workflow, node);
	if (webhookDescription === undefined) return;

	let baseUrl: string;
	if (webhookDescription.nodeType === 'mcp') {
		baseUrl = isTest === true ? additionalData.mcpTestBaseUrl : additionalData.mcpBaseUrl;
	} else if (webhookDescription.nodeType === 'form') {
		baseUrl = isTest === true ? additionalData.formTestBaseUrl : additionalData.formBaseUrl;
	} else {
		baseUrl = isTest === true ? additionalData.webhookTestBaseUrl : additionalData.webhookBaseUrl;
	}

	// Prefer the field's native resolver (see `webhookDescriptionFields` in
	// n8n-workflow) so static-parameter nodes never engage the expression engine.
	const nativePath = resolveWebhookDescriptionField(node, webhookDescription, 'path');
	const path = nativePath.resolved
		? nativePath.value
		: workflow.expression.getSimpleParameterValue(
				node,
				webhookDescription.path,
				mode,
				additionalKeys,
			);
	if (path === undefined || path === null) return;

	const nativeIsFullPath = resolveWebhookDescriptionField(node, webhookDescription, 'isFullPath');
	const isFullPath = (
		nativeIsFullPath.resolved
			? nativeIsFullPath.value
			: workflow.expression.getSimpleParameterValue(
					node,
					webhookDescription.isFullPath,
					mode,
					additionalKeys,
					undefined,
					false,
				)
	) as boolean;
	return NodeHelpers.getNodeWebhookUrl(baseUrl, workflow.id, node, path.toString(), isFullPath);
}
