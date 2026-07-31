import type {
	IWebhookData,
	INode,
	IWorkflowDataProxyAdditionalKeys,
	Workflow,
	WorkflowExecuteMode,
	IExecuteData,
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
	 * Resolves a simple field of the webhook description — natively where
	 * possible, see `WorkflowExpression.getWebhookDescriptionValue`.
	 */
	evaluateSimpleWebhookDescriptionExpression<T extends boolean | number | string | unknown[]>(
		propertyName: string,
		executeData?: IExecuteData,
		defaultValue?: T,
	): T | undefined {
		return this.workflow.expression.getWebhookDescriptionValue(
			this.workflowStartNode,
			this.webhookData.webhookDescription,
			propertyName,
			this.executionMode,
			this.additionalKeys,
			executeData,
			defaultValue,
		) as T | undefined;
	}

	/**
	 * Resolves a complex field of the webhook description — natively where
	 * possible, see `WorkflowExpression.getComplexWebhookDescriptionValue`.
	 */
	evaluateComplexWebhookDescriptionExpression<T extends NodeParameterValueType>(
		propertyName: string,
		executeData?: IExecuteData,
		defaultValue?: T,
	): T | undefined {
		return this.workflow.expression.getComplexWebhookDescriptionValue(
			this.workflowStartNode,
			this.webhookData.webhookDescription,
			propertyName,
			this.executionMode,
			this.additionalKeys,
			executeData,
			defaultValue,
		) as T | undefined;
	}
}
