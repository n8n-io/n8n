import { Expression, type IWorkflowDataProxyData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { N8nApi } from '../N8nApi.credentials';

describe('N8nApi credential test', () => {
	const credential = new N8nApi();
	const expression = new Expression('UTC');

	it.each([
		{
			baseUrl: 'http://localhost:5678/api/v1',
			expectedUrl: 'http://localhost:5678/api/v1/credentials/schema/n8nApi',
		},
		{
			baseUrl: 'http://localhost:5678//api/v1',
			expectedUrl: 'http://localhost:5678/api/v1/credentials/schema/n8nApi',
		},
		{
			baseUrl: 'http://localhost:5678/api/v1/',
			expectedUrl: 'http://localhost:5678/api/v1/credentials/schema/n8nApi',
		},
		{
			baseUrl: 'http://localhost:5678/api/v1///',
			expectedUrl: 'http://localhost:5678/api/v1/credentials/schema/n8nApi',
		},
		{
			baseUrl: 'http://localhost:5678//api//v1///',
			expectedUrl: 'http://localhost:5678/api/v1/credentials/schema/n8nApi',
		},
		{
			baseUrl: 'https://example.com/n8n//api/v1///',
			expectedUrl: 'https://example.com/n8n/api/v1/credentials/schema/n8nApi',
		},
		{
			baseUrl: 'http://[::1]:5678//api/v1///',
			expectedUrl: 'http://[::1]:5678/api/v1/credentials/schema/n8nApi',
		},
		{
			baseUrl: 'https://example.com/n8n%2Ftest//api/v1///',
			expectedUrl: 'https://example.com/n8n%2Ftest/api/v1/credentials/schema/n8nApi',
		},
	])('should resolve the schema URL for $baseUrl', async ({ baseUrl, expectedUrl }) => {
		await expression.withIsolate(async () => {
			const baseURL = expression.resolveSimpleParameterValue(
				credential.test.request.baseURL,
				mock<IWorkflowDataProxyData>({ $credentials: { baseUrl } }),
			);

			expect(`${baseURL}${credential.test.request.url}`).toBe(expectedUrl);
		});
	});
});
