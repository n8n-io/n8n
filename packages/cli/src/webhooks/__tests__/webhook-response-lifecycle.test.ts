import type { ITaskData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { WebhookExecutionContext } from '../webhook-execution-context';
import { WebhookResponseHeaders } from '../webhook-response-headers';
import {
	createWebhookLastNodeResponse,
	createWebhookOnReceivedResponse,
} from '../webhook-response-lifecycle';

test('captures the evaluated immediate response before the context changes', () => {
	const context = mock<WebhookExecutionContext>();
	context.evaluateComplexWebhookDescriptionExpression.mockReturnValue('before');
	const headers = WebhookResponseHeaders.fromObject({ 'X-Status': 'accepted' });

	const response = createWebhookOnReceivedResponse(context, {}, 202, headers);
	context.evaluateComplexWebhookDescriptionExpression.mockReturnValue('after');

	expect(response.body).toBe('before');
	expect(response.code).toBe(202);
	expect(response.headers?.toObject()).toEqual({ 'x-status': 'accepted' });
});

test('applies the extracted last-node content type before returning the response', async () => {
	const task = mock<ITaskData>({ data: { main: [[{ json: { body: { id: 42 } } }]] } });
	const headers = WebhookResponseHeaders.fromObject({ 'X-Result': 'ready' });

	const result = await createWebhookLastNodeResponse(
		{
			responseMode: 'lastNode',
			responseCode: 201,
			responseData: 'firstEntryJson',
			checkAllMainOutputs: false,
			responsePropertyName: 'body',
			responseContentType: 'application/custom+json',
			responseBinaryPropertyName: 'data',
		},
		task,
		headers,
	);

	expect(result.ok).toBe(true);
	if (!result.ok) throw result.error;
	expect(result.result).toMatchObject({ code: 201, body: { id: 42 } });
	expect(result.result.headers?.toObject()).toEqual({
		'x-result': 'ready',
		'content-type': 'application/custom+json',
	});
});
