import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import { ServiceNowBasicApi } from 'n8n-nodes-base/credentials/ServiceNowBasicApi.credentials';
import type {
	ICredentialsDecrypted,
	INodeType,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
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
		nodeTypes.getByNameAndVersion.mockReturnValue(
			mock<INodeType>({
				description: { name: 'n8n-nodes-base.noOp', version: 1, properties: [] },
			}),
		);
		vi.spyOn(credentialsHelper, 'applyDefaultsAndOverwrites').mockImplementation(
			async (_additionalData, data) => data,
		);
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>({ credentialsHelper }),
		);
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
		vi.restoreAllMocks();
	});

	it('accepts credentials when ServiceNow returns 200', async () => {
		const serviceNow = nock(baseURL)
			.get(/.*/)
			.query(true)
			.basicAuth({ user: credentialsData.user, pass: credentialsData.password })
			.reply(200, { result: [{ sys_id: 'record-id' }] });

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
		expect(result.status).toBe('Error');
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
			.get(/.*/)
			.query(true)
			.basicAuth({ user: credentialsData.user, pass: credentialsData.password })
			.reply((uri) => {
				const { pathname } = new URL(uri, baseURL);
				if (pathname.startsWith('/api/now/table/') && pathname !== '/api/now/table/incident') {
					return [403, { error: { message: 'User Not Authorized', detail: 'Read access denied' } }];
				}
				return [200, { result: [] }];
			});

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
		expect(requestedUrl).toBeDefined();
		if (requestedUrl?.pathname.startsWith('/api/now/table/')) {
			expect.soft(requestedUrl.searchParams.get('sysparm_limit')).toBe('1');
			expect.soft(requestedUrl.searchParams.get('sysparm_fields')).toBe('sys_id');
		}
	});
});
