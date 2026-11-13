import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const translations = [{ detected_source_language: 'EN', text: 'Hallo Welt' }];

describe('DeepL > Workflows', () => {
	describe('Pro plan', () => {
		beforeAll(() => {
			nock('https://api.deepl.com').get('/v2/translate').reply(200, { translations });
		});

		new NodeTestHarness().setupTests({
			credentials: { deepLApi: { apiKey: 'fake-api-key', apiPlan: 'pro' } },
			workflowFiles: ['requests.workflow.json'],
		});
	});

	describe('Free plan', () => {
		beforeAll(() => {
			nock('https://api-free.deepl.com').get('/v2/translate').reply(200, { translations });
		});

		new NodeTestHarness().setupTests({
			credentials: { deepLApi: { apiKey: 'fake-api-key', apiPlan: 'free' } },
			workflowFiles: ['requests.workflow.json'],
		});
	});
});
