import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import { ServiceNowBasicApi } from 'n8n-nodes-base/credentials/ServiceNowBasicApi.credentials';
import { ServiceNow } from 'n8n-nodes-base/nodes/ServiceNow/ServiceNow.node';
import type { ICredentialsDecrypted, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';
import { CredentialsHelper } from '@/credentials-helper';
import type { NodeTypes } from '@/node-types';
import { CredentialsTester } from '@/services/credentials-tester.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

describe('ServiceNow Basic Auth credential test', () => {
	const credentialType = new ServiceNowBasicApi();
	const baseURL = 'https://test-instance.service-now.com';
	const credentialsData = {
		user: 'incident.integration',
		password: 'test-password',
		subdomain: 'test-instance',
	};
	const credentialTypes = mock<CredentialTypes>();
	const nodeTypes = mock<NodeTypes>();
	const credentialsHelper = new CredentialsHelper(
		credentialTypes,
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
	);
	const credentialsTester = new CredentialsTester(
		mock(),
		mock(),
		credentialTypes,
		nodeTypes,
		credentialsHelper,
	);

	async function testCredentials(data = credentialsData) {
		const credentials: ICredentialsDecrypted = {
			id: 'service-now-credential',
			name: 'ServiceNow integration',
			type: credentialType.name,
			data: { ...data },
		};
		return await credentialsTester.testCredentials('user-id', credentialType.name, credentials);
	}

	beforeEach(() => {
		nock.disableNetConnect();
		credentialTypes.getByName.mockReturnValue(credentialType);
		credentialTypes.getParentTypes.mockReturnValue(['httpBasicAuth']);
		credentialTypes.getSupportedNodes.mockReturnValue(['n8n-nodes-base.serviceNow']);
		nodeTypes.getByName.mockReturnValue(new ServiceNow());
		vi.spyOn(credentialsHelper, 'applyDefaultsAndOverwrites').mockImplementation(
			async (_additionalData, data) => data,
		);
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>({ credentialsHelper, hooks: undefined }),
		);
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
		vi.restoreAllMocks();
	});

	it.each([200, 204, 299])('accepts credentials when ServiceNow returns %i', async (statusCode) => {
		const serviceNow = nock(baseURL)
			.get(/.*/)
			.query(true)
			.basicAuth({ user: credentialsData.user, pass: credentialsData.password })
			.reply(statusCode, { result: [{ sys_id: 'record-id' }] });

		const result = await testCredentials();

		expect(serviceNow.isDone()).toBe(true);
		expect(result.status).toBe('OK');
	});

	it('rejects credentials when ServiceNow returns 401', async () => {
		const serviceNow = nock(baseURL)
			.persist()
			.get(/.*/)
			.query(true)
			.basicAuth({ user: credentialsData.user, pass: 'incorrect-password' })
			.reply(401, { error: { message: 'User Not Authenticated' } });

		const result = await testCredentials({ ...credentialsData, password: 'incorrect-password' });

		expect(serviceNow.isDone()).toBe(true);
		expect(result).toEqual({
			status: 'Error',
			message: 'Authentication failed. Check your user and password.',
		});
	});

	it.each([302, 400, 404, 418, 429, 500, 503])(
		'reports an error when ServiceNow returns %i',
		async (statusCode) => {
			const serviceNow = nock(baseURL)
				.persist()
				.get(/.*/)
				.query(true)
				.basicAuth({ user: credentialsData.user, pass: credentialsData.password })
				.reply(statusCode, { error: { message: 'Request failed' } });

			const result = await testCredentials();

			expect(serviceNow.isDone()).toBe(true);
			expect(result.status).toBe('Error');
			expect(result.message).toContain(`ServiceNow returned HTTP ${statusCode}`);
		},
	);

	it('reports an error when ServiceNow cannot be reached', async () => {
		const serviceNow = nock(baseURL)
			.get(/.*/)
			.query(true)
			.basicAuth({ user: credentialsData.user, pass: credentialsData.password })
			.replyWithError(new Error('Connection refused'));

		const result = await testCredentials();

		expect(serviceNow.isDone()).toBe(true);
		expect(result.status).toBe('Error');
	});

	it('reports a redirect without sending a second request', async () => {
		const serviceNow = nock(baseURL)
			.get('/api/now/table/sys_user')
			.query(true)
			.basicAuth({ user: credentialsData.user, pass: credentialsData.password })
			.reply(302, undefined, { location: 'https://example.com/credential-check' });
		const destination = nock('https://example.com').get('/credential-check').query(true).reply(200);

		const result = await testCredentials();

		expect(serviceNow.isDone()).toBe(true);
		expect(destination.isDone()).toBe(false);
		expect(result.status).toBe('Error');
		expect(result.message).toContain('ServiceNow returned HTTP 302');
	});

	// NODE-6020: An incident-only account can authenticate without access to system tables.
	it('accepts an authenticated account that cannot read system tables', async () => {
		const incident = nock(baseURL)
			.get('/api/now/table/incident')
			.query({ sysparm_limit: '1', sysparm_fields: 'sys_id' })
			.basicAuth({ user: credentialsData.user, pass: credentialsData.password })
			.reply(200, { result: [{ sys_id: 'incident-id' }] });

		const incidentResponse = await Container.get(OutboundHttp)
			.requests()
			.request({
				url: `${baseURL}/api/now/table/incident`,
				qs: { sysparm_limit: '1', sysparm_fields: 'sys_id' },
				auth: { username: credentialsData.user, password: credentialsData.password },
			});
		expect(incident.isDone()).toBe(true);
		expect(incidentResponse).toEqual({ result: [{ sys_id: 'incident-id' }] });

		const credentialCheck = nock(baseURL)
			.get('/api/now/table/sys_user')
			.query(true)
			.basicAuth({ user: credentialsData.user, pass: credentialsData.password })
			.reply(403, { error: { message: 'User Not Authorized', detail: 'Read access denied' } });

		const result = await testCredentials();

		expect(credentialCheck.isDone()).toBe(true);
		expect(result.status).toBe('OK');
	});

	// NODE-6020: Credential checks must limit table rows and field resolution.
	it('limits a table credential check to one record and its identifier', async () => {
		let requestedUrl: URL | undefined;
		const serviceNow = nock(baseURL)
			.get(/.*/)
			.query(true)
			.basicAuth({ user: credentialsData.user, pass: credentialsData.password })
			.reply((uri) => {
				requestedUrl = new URL(uri, baseURL);
				return [200, { result: [{ sys_id: 'record-id' }] }];
			});

		const result = await testCredentials();

		expect(serviceNow.isDone()).toBe(true);
		expect(result.status).toBe('OK');
		expect(requestedUrl?.pathname).toBe('/api/now/table/sys_user');
		expect
			.soft(requestedUrl?.searchParams.get('sysparm_query'))
			.toBe(`user_name=${credentialsData.user}`);
		expect.soft(requestedUrl?.searchParams.get('sysparm_limit')).toBe('1');
		expect.soft(requestedUrl?.searchParams.get('sysparm_fields')).toBe('sys_id');
	});
});
