import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { bubbleApiRequest } from '../GenericFunctions';

const objectId = '1696851234567x123456789012345678/x?y=1';

async function requestedUrl(credentials: Record<string, string>) {
	const context = mockDeep<IExecuteFunctions>();
	context.getCredentials.mockResolvedValue({ apiToken: 'fake-api-token', ...credentials });
	context.helpers.request.mockResolvedValue({});

	await bubbleApiRequest.call(context, 'GET', requestPath`/obj/customer/${objectId}`, {}, {});

	const [options] = context.helpers.request.mock.calls[0] as [{ uri: unknown }];
	return String(options.uri);
}

describe('bubbleApiRequest', () => {
	it('should encode path values for a Bubble-hosted app', async () => {
		const url = await requestedUrl({
			appName: 'acme-crm',
			environment: 'development',
			hosting: 'bubbleHosted',
		});

		expect(url).toBe(
			'https://acme-crm.bubbleapps.io/version-test/api/1.1/obj/customer/1696851234567x123456789012345678%2Fx%3Fy=1',
		);
	});

	it('should encode path values for a self-hosted app', async () => {
		const url = await requestedUrl({
			domain: 'https://bubble.example.com/',
			environment: 'live',
			hosting: 'selfHosted',
		});

		expect(url).toBe(
			'https://bubble.example.com/api/1.1/obj/customer/1696851234567x123456789012345678%2Fx%3Fy=1',
		);
	});

	it('should reject an app name that is not a host label', async () => {
		await expect(
			requestedUrl({ appName: 'acme/x', environment: 'live', hosting: 'bubbleHosted' }),
		).rejects.toThrow('Invalid host');
	});
});
