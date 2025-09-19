import type {
	WebhookType,
	Workflow,
	INode,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
	IWorkflowDataProxyAdditionalKeys,
	IWebhookDescription,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

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
	let baseUrl = additionalData.webhookBaseUrl;
	if (isTest === true) {
		baseUrl = additionalData.webhookTestBaseUrl;
	}

	const webhookDescription = getWebhookDescription(name, workflow, node);
	if (webhookDescription === undefined) return;

	const path = workflow.expression.getSimpleParameterValue(
		node,
		webhookDescription.path,
		mode,
		additionalKeys,
	);
	if (path === undefined) return;

	const isFullPath: boolean = workflow.expression.getSimpleParameterValue(
		node,
		webhookDescription.isFullPath,
		mode,
		additionalKeys,
		undefined,
		false,
	) as boolean;
	return NodeHelpers.getNodeWebhookUrl(baseUrl, workflow.id, node, path.toString(), isFullPath);
}
