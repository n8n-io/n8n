'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.WebhookExecutionContext = void 0;
class WebhookExecutionContext {
	constructor(workflow, workflowStartNode, webhookData, executionMode, additionalKeys) {
		this.workflow = workflow;
		this.workflowStartNode = workflowStartNode;
		this.webhookData = webhookData;
		this.executionMode = executionMode;
		this.additionalKeys = additionalKeys;
	}
	evaluateSimpleWebhookDescriptionExpression(propertyName, executeData, defaultValue) {
		return this.workflow.expression.getSimpleParameterValue(
			this.workflowStartNode,
			this.webhookData.webhookDescription[propertyName],
			this.executionMode,
			this.additionalKeys,
			executeData,
			defaultValue,
		);
	}
	evaluateComplexWebhookDescriptionExpression(propertyName, executeData, defaultValue) {
		return this.workflow.expression.getComplexParameterValue(
			this.workflowStartNode,
			this.webhookData.webhookDescription[propertyName],
			this.executionMode,
			this.additionalKeys,
			executeData,
			defaultValue,
		);
	}
}
exports.WebhookExecutionContext = WebhookExecutionContext;
//# sourceMappingURL=webhook-execution-context.js.map
