import type {
	IWebhookData,
	INode,
	IWorkflowDataProxyAdditionalKeys,
	Workflow,
	WorkflowExecuteMode,
	IExecuteData,
	IWebhookDescription,
	NodeParameterValueType,
} from 'n8n-workflow';

/**
 * A helper class that holds the context for the webhook execution.
 * Provides quality of life methods for evaluating expressions.
 */
export class WebhookExecutionContext {
	constructor(
		readonly workflow: Workflow,
		readonly workflowStartNode: INode,
		readonly webhookData: IWebhookData,
		readonly executionMode: WorkflowExecuteMode,
		readonly additionalKeys: IWorkflowDataProxyAdditionalKeys,
	) {}

	/**
	 * Evaluates a simple expression from the webhook description.
	 */
	evaluateSimpleWebhookDescriptionExpression<T extends boolean | number | string | unknown[]>(
		propertyName: keyof IWebhookDescription,
		executeData?: IExecuteData,
		defaultValue?: T,
	): T | undefined {
		return this.workflow.expression.getSimpleParameterValue(
			this.workflowStartNode,
			this.webhookData.webhookDescription[propertyName],
			this.executionMode,
			this.additionalKeys,
			executeData,
			defaultValue,
		) as T | undefined;
	}

	/**
	 * Evaluates a complex expression from the webhook description.
	 */
	evaluateComplexWebhookDescriptionExpression<T extends NodeParameterValueType>(
		propertyName: keyof IWebhookDescription,
		executeData?: IExecuteData,
		defaultValue?: T,
	): T | undefined {
		return this.workflow.expression.getComplexParameterValue(
			this.workflowStartNode,
			this.webhookData.webhookDescription[propertyName],
			this.executionMode,
			this.additionalKeys,
			executeData,
			defaultValue,
		) as T | undefined;
	}
}
