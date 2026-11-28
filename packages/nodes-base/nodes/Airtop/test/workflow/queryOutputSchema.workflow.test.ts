import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const queryPath =
	'/api/v1/sessions/3f9a6c2e-8b41-4d7a-9e05-1c2b3d4e5f60/windows/7b8c9d0e-1f2a-4b3c-8d4e-5f6a7b8c9d0e/page-query';

const queryBody = (outputSchema: string) => ({
	prompt: 'What is the page title?',
	configuration: {
		experimental: { includeVisualAnalysis: 'disabled' },
		outputSchema,
	},
});

describe('Airtop > Query output schema', () => {
	afterEach(() => nock.cleanAll());

	new NodeTestHarness().setupTests({
		workflowFiles: ['queryOutputSchema.workflow.json'],
		nock: {
			baseUrl: 'https://api.airtop.ai',
			mocks: [
				{
					method: 'post',
					path: queryPath,
					requestBody: queryBody('{"type":"object","properties":{"title":{"type":"string"}}}'),
					statusCode: 200,
					responseBody: { data: { modelResponse: '{"title":"Example"}' } },
				},
				{
					method: 'post',
					path: queryPath,
					requestBody: queryBody('{"type":"object","properties":{"name":{"type":"string"}}}'),
					statusCode: 200,
					responseBody: { data: { modelResponse: '{"name":"Example"}' } },
				},
			],
		},
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
