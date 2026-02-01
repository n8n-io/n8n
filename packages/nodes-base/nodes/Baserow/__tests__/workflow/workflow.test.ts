import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import {
	createResponse,
	fieldsResponse,
	getAllResponse,
	getResponse,
	updateResponse,
} from './apiResponses';

describe('Baserow > Workflows', () => {
	const credentials = {
		baserowApi: {
			host: 'https://api.baserow.io',
			username: 'nathan@n8n.io',
			password: 'fake-password',
		},
	};

	describe('Run workflow', () => {
		beforeAll(() => {
			const mock = nock('https://api.baserow.io');
			// Baserow > Get Token
			mock
				.persist()
				.post('/api/user/token-auth/', { username: 'nathan@n8n.io', password: 'fake-password' })
				.reply(200, {
					token: 'fake-jwt-token',
				});
			// Baserow > Get Fields
			mock.get('/api/database/fields/table/482710/').reply(200, fieldsResponse);
			// Baserow > Get Row
			mock.get('/api/database/rows/table/482710/1/').reply(200, getResponse);
			// Baserow > Get all rows
			mock
				.get('/api/database/rows/table/482710/')
				.query({ page: 1, size: 100 })
				.reply(200, getAllResponse);
			// Baserow > Create Row
			mock
				.post('/api/database/rows/table/482710/', {
					field_3799030: 'Nathan',
					field_3799031: 'testing',
				})
				.reply(200, createResponse);
			// Baserow > Update Row
			mock
				.patch('/api/database/rows/table/482710/3/', {
					field_3799032: 'true',
				})
				.reply(200, updateResponse);
			// Baserow > Delete Row
			mock.delete('/api/database/rows/table/482710/3/').reply(200, {});
		});

		new NodeTestHarness().setupTests({ credentials });
	});
});
