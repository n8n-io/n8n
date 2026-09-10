import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import nock from 'nock';

import { CREDENTIALS_REPORT, INSTANCE_REPORT } from '@/security-audit/constants';

import { simulateUpToDateInstance } from '../security-audit/utils';
import { createCredentials } from '../shared/db/credentials';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let owner: User;
let authOwnerAgent: SuperAgentTest;

// The nodes reporter reads the installed community packages, so its entity must be registered.
const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi'],
	modules: ['community-packages'],
});

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'CredentialsEntity', 'WorkflowEntity']);

	nock.cleanAll();
	// The instance reporter asks api.n8n.io for newer releases; pin it so the report is stable.
	simulateUpToDateInstance();

	authOwnerAgent = testServer.publicApiAgentFor(owner);
});

afterAll(() => {
	nock.cleanAll();
});

describe('POST /audit', () => {
	test('should fail due to missing API key', async () => {
		void authOwnerAgent.set({ 'X-N8N-API-KEY': null });

		const response = await authOwnerAgent.post('/audit');

		expect(response.statusCode).toBe(401);
	});

	test('should fail due to invalid API key', async () => {
		void authOwnerAgent.set({ 'X-N8N-API-KEY': 'abcXYZ' });

		const response = await authOwnerAgent.post('/audit');

		expect(response.statusCode).toBe(401);
	});

	test('should fail when the API key lacks securityAudit:generate', async () => {
		const member = await createMemberWithApiKey({ scopes: ['tag:list'] });

		const response = await testServer.publicApiAgentFor(member).post('/audit');

		expect(response.statusCode).toBe(403);
		expect(response.body).toEqual({ message: 'Forbidden' });
	});

	test('should generate a report for every category when no body is sent', async () => {
		const response = await authOwnerAgent.post('/audit');

		expect(response.statusCode).toBe(200);
		expect(Array.isArray(response.body)).toBe(false);
		expect(response.body['Instance Risk Report'].risk).toBe(INSTANCE_REPORT.RISK);
	});

	test('should limit the report to the requested categories', async () => {
		await createCredentials({ name: 'Unused credential', type: 'someType', data: '' });

		const response = await authOwnerAgent
			.post('/audit')
			.send({ additionalOptions: { categories: ['credentials'] } });

		expect(response.statusCode).toBe(200);
		expect(Object.keys(response.body)).toEqual(['Credentials Risk Report']);

		const report = response.body['Credentials Risk Report'];
		expect(report.risk).toBe(CREDENTIALS_REPORT.RISK);
		expect(report.sections).toContainEqual(
			expect.objectContaining({
				title: CREDENTIALS_REPORT.SECTIONS.CREDS_NOT_IN_ANY_USE,
				location: [expect.objectContaining({ kind: 'credential', name: 'Unused credential' })],
			}),
		);
	});

	test('should return an empty array when the requested category finds no risk', async () => {
		const response = await authOwnerAgent
			.post('/audit')
			.send({ additionalOptions: { categories: ['credentials'] } });

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual([]);
	});

	test('should accept daysAbandonedWorkflow', async () => {
		await createCredentials({ name: 'Unused credential', type: 'someType', data: '' });

		const response = await authOwnerAgent
			.post('/audit')
			.send({ additionalOptions: { categories: ['credentials'], daysAbandonedWorkflow: 10 } });

		expect(response.statusCode).toBe(200);
		expect(response.body['Credentials Risk Report'].sections).toContainEqual(
			expect.objectContaining({ title: CREDENTIALS_REPORT.SECTIONS.CREDS_NOT_RECENTLY_EXECUTED }),
		);
	});

	test('should fail on an unknown category', async () => {
		const response = await authOwnerAgent
			.post('/audit')
			.send({ additionalOptions: { categories: ['nonsense'] } });

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toContain('request/body/additionalOptions/categories/0');
	});

	test('should fail on a non-integer daysAbandonedWorkflow', async () => {
		const response = await authOwnerAgent
			.post('/audit')
			.send({ additionalOptions: { daysAbandonedWorkflow: 1.5 } });

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toContain('request/body/additionalOptions/daysAbandonedWorkflow');
	});

	test('should ignore an unknown body key, as the replaced schema did', async () => {
		const response = await authOwnerAgent
			.post('/audit')
			.send({ additionalOptions: { categories: ['credentials'] }, unknownKey: 'value' });

		expect(response.statusCode).toBe(200);
	});
});
