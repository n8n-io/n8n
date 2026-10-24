import {
	createTeamProject,
	linkUserToProject,
	randomCredentialPayload,
	testDb,
} from '@n8n/backend-test-utils';
import type { AssignableProjectRole } from '@n8n/permissions';
import { Container } from '@n8n/di';
import type {
	INodeListSearchResult,
	IWorkflowExecuteAdditionalData,
	ResourceMapperFields,
	NodeParameterValueType,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import * as AdditionalData from '@/workflow-execute-additional-data';

import { saveCredential, shareCredentialWithUsers } from '../shared/db/credentials';
import { createCustomRoleWithScopeSlugs } from '../shared/db/roles';
import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

describe('DynamicNodeParametersController', () => {
	const additionalData = mock<IWorkflowExecuteAdditionalData>();

	const testServer = setupTestServer({
		endpointGroups: ['dynamic-node-parameters'],
		enabledFeatures: ['feat:sharing'],
		quotas: { 'quota:maxTeamProjects': -1 },
	});
	let ownerAgent: SuperAgentTest;
	let service: DynamicNodeParametersService;

	beforeAll(() => {
		service = Container.get(DynamicNodeParametersService);
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(AdditionalData, 'getBase').mockResolvedValue(additionalData);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const commonRequestParams = {
		credentials: {},
		currentNodeParameters: {},
		nodeTypeAndVersion: { name: 'TestNode', version: 1 },
		path: 'path',
	};

	describe('POST /dynamic-node-parameters/options', () => {
		it('should take params via body', async () => {
			const owner = await createOwner();
			ownerAgent = testServer.authAgentFor(owner);

			vi.spyOn(service, 'getOptionsViaMethodName').mockResolvedValue([]);

			await ownerAgent
				.post('/dynamic-node-parameters/options')
				.send({
					...commonRequestParams,
					methodName: 'testMethod',
				})
				.expect(200);
		});

		it('should take params with loadOptions', async () => {
			const owner = await createOwner();
			ownerAgent = testServer.authAgentFor(owner);

			const expectedResult = [{ name: 'Test Option', value: 'test' }];
			vi.spyOn(service, 'getOptionsViaLoadOptionsByPath').mockResolvedValue(expectedResult);
			vi.spyOn(service, 'getOptionsViaLoadOptions').mockResolvedValue(expectedResult);

			const response = await ownerAgent
				.post('/dynamic-node-parameters/options')
				.send({
					...commonRequestParams,
					loadOptions: { type: 'test' },
				})
				.expect(200);

			expect(response.body).toEqual({ data: expectedResult });
		});

		it('should return empty array when no method or loadOptions provided', async () => {
			const owner = await createOwner();
			ownerAgent = testServer.authAgentFor(owner);

			const response = await ownerAgent
				.post('/dynamic-node-parameters/options')
				.send({
					...commonRequestParams,
				})
				.expect(200);

			expect(response.body).toEqual({ data: [] });
		});
	});

	describe('POST /dynamic-node-parameters/resource-locator-results', () => {
		it('should return resource locator results', async () => {
			const owner = await createOwner();
			ownerAgent = testServer.authAgentFor(owner);

			const expectedResult: INodeListSearchResult = { results: [] };
			vi.spyOn(service, 'getResourceLocatorResults').mockResolvedValue(expectedResult);

			const response = await ownerAgent
				.post('/dynamic-node-parameters/resource-locator-results')
				.send({
					...commonRequestParams,
					methodName: 'testMethod',
					filter: 'testFilter',
					paginationToken: 'testToken',
				})
				.expect(200);

			expect(response.body).toEqual({ data: expectedResult });
		});

		it('should handle resource locator results without pagination', async () => {
			const owner = await createOwner();
			ownerAgent = testServer.authAgentFor(owner);

			vi.spyOn(service, 'getResourceLocatorResults').mockResolvedValue({ results: [] });

			await ownerAgent
				.post('/dynamic-node-parameters/resource-locator-results')
				.send({
					methodName: 'testMethod',
					...commonRequestParams,
				})
				.expect(200);
		});

		it('should return a 400 if methodName is not defined', async () => {
			const owner = await createOwner();
			ownerAgent = testServer.authAgentFor(owner);

			await ownerAgent
				.post('/dynamic-node-parameters/resource-locator-results')
				.send(commonRequestParams)
				.expect(400);
		});
	});

	describe('POST /dynamic-node-parameters/resource-mapper-fields', () => {
		it('should return resource mapper fields', async () => {
			const owner = await createOwner();
			ownerAgent = testServer.authAgentFor(owner);

			const expectedResult: ResourceMapperFields = { fields: [] };
			vi.spyOn(service, 'getResourceMappingFields').mockResolvedValue(expectedResult);

			const response = await ownerAgent
				.post('/dynamic-node-parameters/resource-mapper-fields')
				.send({
					...commonRequestParams,
					methodName: 'testMethod',
					loadOptions: 'testLoadOptions',
				})
				.expect(200);

			expect(response.body).toEqual({ data: expectedResult });
		});

		it('should return a 400 if methodName is not defined', async () => {
			const owner = await createOwner();
			ownerAgent = testServer.authAgentFor(owner);

			await ownerAgent
				.post('/dynamic-node-parameters/resource-mapper-fields')
				.send(commonRequestParams)
				.expect(400);
		});
	});

	describe('POST /dynamic-node-parameters/local-resource-mapper-fields', () => {
		it('should return local resource mapper fields', async () => {
			const owner = await createOwner();
			ownerAgent = testServer.authAgentFor(owner);

			const expectedResult: ResourceMapperFields = { fields: [] };
			vi.spyOn(service, 'getLocalResourceMappingFields').mockResolvedValue(expectedResult);

			const response = await ownerAgent
				.post('/dynamic-node-parameters/local-resource-mapper-fields')
				.send({
					...commonRequestParams,
					methodName: 'testMethod',
				})
				.expect(200);

			expect(response.body).toEqual({ data: expectedResult });
		});

		it('should return a 400 if methodName is not defined', async () => {
			const owner = await createOwner();
			ownerAgent = testServer.authAgentFor(owner);

			await ownerAgent
				.post('/dynamic-node-parameters/local-resource-mapper-fields')
				.send(commonRequestParams)
				.expect(400);
		});
	});

	describe('POST /dynamic-node-parameters/action-result', () => {
		it('should return action result with handler', async () => {
			const owner = await createOwner();
			ownerAgent = testServer.authAgentFor(owner);

			const expectedResult: NodeParameterValueType = { test: true };
			vi.spyOn(service, 'getActionResult').mockResolvedValue(expectedResult);

			const response = await ownerAgent
				.post('/dynamic-node-parameters/action-result')
				.send({
					...commonRequestParams,
					handler: 'testHandler',
					payload: { someData: 'test' },
				})
				.expect(200);

			expect(response.body).toEqual({ data: expectedResult });
		});

		it('should return a 400 if handler is not defined', async () => {
			const owner = await createOwner();
			ownerAgent = testServer.authAgentFor(owner);

			await ownerAgent
				.post('/dynamic-node-parameters/action-result')
				.send({
					...commonRequestParams,
					payload: { someData: 'test' },
				})
				.expect(400);
		});
	});

	describe('credential access enforcement', () => {
		let member: Awaited<ReturnType<typeof createMember>>;
		let memberAgent: SuperAgentTest;

		beforeEach(async () => {
			await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
			member = await createMember();
			memberAgent = testServer.authAgentFor(member);
		});

		it('should return 403 when user does not have access to supplied credential on /options', async () => {
			const owner = await createOwner();
			const ownerCredential = await saveCredential(randomCredentialPayload(), {
				user: owner,
				role: 'credential:owner',
			});

			await memberAgent
				.post('/dynamic-node-parameters/options')
				.send({
					...commonRequestParams,
					credentials: { httpBasicAuth: { id: ownerCredential.id, name: ownerCredential.name } },
				})
				.expect(403);
		});

		it('should return 403 when user does not have access to supplied credential on /resource-locator-results', async () => {
			const owner = await createOwner();
			const ownerCredential = await saveCredential(randomCredentialPayload(), {
				user: owner,
				role: 'credential:owner',
			});

			await memberAgent
				.post('/dynamic-node-parameters/resource-locator-results')
				.send({
					...commonRequestParams,
					methodName: 'searchItems',
					credentials: { httpBasicAuth: { id: ownerCredential.id, name: ownerCredential.name } },
				})
				.expect(403);
		});

		it('should return 403 when user does not have access to supplied credential on /resource-mapper-fields', async () => {
			const owner = await createOwner();
			const ownerCredential = await saveCredential(randomCredentialPayload(), {
				user: owner,
				role: 'credential:owner',
			});

			await memberAgent
				.post('/dynamic-node-parameters/resource-mapper-fields')
				.send({
					...commonRequestParams,
					methodName: 'getFields',
					credentials: { httpBasicAuth: { id: ownerCredential.id, name: ownerCredential.name } },
				})
				.expect(403);
		});

		it('should return 403 when user does not have access to supplied credential on /action-result', async () => {
			const owner = await createOwner();
			const ownerCredential = await saveCredential(randomCredentialPayload(), {
				user: owner,
				role: 'credential:owner',
			});

			await memberAgent
				.post('/dynamic-node-parameters/action-result')
				.send({
					...commonRequestParams,
					handler: 'handleAction',
					payload: {},
					credentials: { httpBasicAuth: { id: ownerCredential.id, name: ownerCredential.name } },
				})
				.expect(403);
		});

		it('should return 403 when workflowId is absent but credential is inaccessible', async () => {
			const owner = await createOwner();
			const ownerCredential = await saveCredential(randomCredentialPayload(), {
				user: owner,
				role: 'credential:owner',
			});

			// No workflowId — ensures the early-return bypass path is also blocked
			await memberAgent
				.post('/dynamic-node-parameters/options')
				.send({
					...commonRequestParams,
					credentials: { httpBasicAuth: { id: ownerCredential.id, name: ownerCredential.name } },
				})
				.expect(403);
		});

		it('should not return 403 when user has access to the supplied credential', async () => {
			const ownCredential = await saveCredential(randomCredentialPayload(), {
				user: member,
				role: 'credential:owner',
			});

			vi.spyOn(service, 'getOptionsViaMethodName').mockResolvedValue([]);

			const { status } = await memberAgent.post('/dynamic-node-parameters/options').send({
				...commonRequestParams,
				methodName: 'testMethod',
				credentials: { httpBasicAuth: { id: ownCredential.id, name: ownCredential.name } },
			});

			expect(status).not.toBe(403);
		});

		it('should not return 403 when no credentials are supplied', async () => {
			vi.spyOn(service, 'getOptionsViaMethodName').mockResolvedValue([]);

			const { status } = await memberAgent.post('/dynamic-node-parameters/options').send({
				...commonRequestParams,
				methodName: 'testMethod',
			});

			expect(status).not.toBe(403);
		});
	});

	describe('see-only credential access', () => {
		// A project viewer and a custom project role with only `credential:read`
		// can see a credential but must not make the instance call a service
		// with it. Every role that holds more than see-rights keeps loading.
		type Route = {
			path: string;
			body: Record<string, unknown>;
			stub: () => void;
			method: () => unknown;
		};

		const routes: Route[] = [
			{
				path: '/dynamic-node-parameters/options',
				body: { methodName: 'testMethod' },
				stub: () => vi.spyOn(service, 'getOptionsViaMethodName').mockResolvedValue([]),
				method: () => service.getOptionsViaMethodName,
			},
			{
				path: '/dynamic-node-parameters/resource-locator-results',
				body: { methodName: 'searchItems' },
				stub: () =>
					vi.spyOn(service, 'getResourceLocatorResults').mockResolvedValue({ results: [] }),
				method: () => service.getResourceLocatorResults,
			},
			{
				path: '/dynamic-node-parameters/resource-mapper-fields',
				body: { methodName: 'getFields' },
				stub: () => vi.spyOn(service, 'getResourceMappingFields').mockResolvedValue({ fields: [] }),
				method: () => service.getResourceMappingFields,
			},
			{
				path: '/dynamic-node-parameters/action-result',
				body: { handler: 'handleAction', payload: {} },
				stub: () => vi.spyOn(service, 'getActionResult').mockResolvedValue({}),
				method: () => service.getActionResult,
			},
		];

		const credentialsFor = (credential: { id: string; name: string }) => ({
			httpBasicAuth: { id: credential.id, name: credential.name },
		});

		beforeEach(async () => {
			await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
		});

		test.each(routes)('$path refuses a project viewer', async ({ path, body, stub, method }) => {
			const project = await createTeamProject();
			const credential = await saveCredential(randomCredentialPayload(), {
				project,
				role: 'credential:owner',
			});
			const viewer = await createMember();
			await linkUserToProject(viewer, project, 'project:viewer');
			stub();

			const { status } = await testServer
				.authAgentFor(viewer)
				.post(path)
				.send({ ...commonRequestParams, ...body, credentials: credentialsFor(credential) });

			expect(status).toBe(403);
			expect(method()).not.toHaveBeenCalled();
		});

		test('refuses a custom project role that only holds see-rights', async () => {
			const project = await createTeamProject();
			const credential = await saveCredential(randomCredentialPayload(), {
				project,
				role: 'credential:owner',
			});
			const role = await createCustomRoleWithScopeSlugs(['credential:list', 'credential:read'], {
				roleType: 'project',
			});
			const user = await createMember();
			await linkUserToProject(user, project, role.slug as AssignableProjectRole);
			vi.spyOn(service, 'getOptionsViaMethodName').mockResolvedValue([]);

			const { status } = await testServer
				.authAgentFor(user)
				.post('/dynamic-node-parameters/options')
				.send({
					...commonRequestParams,
					methodName: 'testMethod',
					credentials: credentialsFor(credential),
				});

			expect(status).toBe(403);
			expect(service.getOptionsViaMethodName).not.toHaveBeenCalled();
		});

		test('allows a project editor', async () => {
			const project = await createTeamProject();
			const credential = await saveCredential(randomCredentialPayload(), {
				project,
				role: 'credential:owner',
			});
			const editor = await createMember();
			await linkUserToProject(editor, project, 'project:editor');
			vi.spyOn(service, 'getOptionsViaMethodName').mockResolvedValue([]);

			const { status } = await testServer
				.authAgentFor(editor)
				.post('/dynamic-node-parameters/options')
				.send({
					...commonRequestParams,
					methodName: 'testMethod',
					credentials: credentialsFor(credential),
				});

			expect(status).toBe(200);
		});

		test('allows a user the credential is shared with', async () => {
			const owner = await createOwner();
			const credential = await saveCredential(randomCredentialPayload(), {
				user: owner,
				role: 'credential:owner',
			});
			const member = await createMember();
			await shareCredentialWithUsers(credential, [member]);
			vi.spyOn(service, 'getOptionsViaMethodName').mockResolvedValue([]);

			const { status } = await testServer
				.authAgentFor(member)
				.post('/dynamic-node-parameters/options')
				.send({
					...commonRequestParams,
					methodName: 'testMethod',
					credentials: credentialsFor(credential),
				});

			expect(status).toBe(200);
		});

		test('allows the instance owner on a project they are not a member of', async () => {
			const project = await createTeamProject();
			const credential = await saveCredential(randomCredentialPayload(), {
				project,
				role: 'credential:owner',
			});
			const owner = await createOwner();
			vi.spyOn(service, 'getOptionsViaMethodName').mockResolvedValue([]);

			const { status } = await testServer
				.authAgentFor(owner)
				.post('/dynamic-node-parameters/options')
				.send({
					...commonRequestParams,
					methodName: 'testMethod',
					credentials: credentialsFor(credential),
				});

			expect(status).toBe(200);
		});
	});
});
