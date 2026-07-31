import { Container } from '@n8n/di';
import type { INode, IWebhookData, IWorkflowDataProxyAdditionalKeys, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { WebhookDescriptionResolver } from '../webhook-description-resolver';
import { WebhookExecutionContext } from '../webhook-execution-context';

// Every description-field read goes through this class, and every one of those
// has to reach `WebhookDescriptionResolver` — a read that bypassed it would call
// the expression engine on a request that skipped acquiring an isolate.
describe('WebhookExecutionContext', () => {
	const descriptionResolver = mock<WebhookDescriptionResolver>();
	Container.set(WebhookDescriptionResolver, descriptionResolver);

	const workflow = mock<Workflow>();
	const node = mock<INode>({ name: 'Webhook', parameters: {} });
	const webhookDescription = {
		name: 'default',
		httpMethod: 'POST',
		path: '={{$parameter["path"]}}',
	};
	const additionalKeys = mock<IWorkflowDataProxyAdditionalKeys>();

	const context = new WebhookExecutionContext(
		workflow,
		node,
		{ webhookDescription } as unknown as IWebhookData,
		'trigger',
		additionalKeys,
	);

	it('delegates a simple value to the resolver', () => {
		context.evaluateSimpleWebhookDescriptionExpression('path', undefined, 'fallback');

		expect(descriptionResolver.simple).toHaveBeenCalledWith(
			workflow,
			node,
			webhookDescription,
			'path',
			'trigger',
			additionalKeys,
			undefined,
			'fallback',
		);
	});

	it('delegates a complex value to the resolver', () => {
		context.evaluateComplexWebhookDescriptionExpression('responseData');

		expect(descriptionResolver.complex).toHaveBeenCalledWith(
			workflow,
			node,
			webhookDescription,
			'responseData',
			'trigger',
			additionalKeys,
			undefined,
			undefined,
		);
	});
});
