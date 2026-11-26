import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	randomCredentialPayload,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type {
	ILocalLoadOptionsFunctions,
	INodeListSearchResult,
	INodeType,
	IWorkflowExecuteAdditionalData,
	ResourceMapperFields,
	NodeParameterValueType,
} from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import * as AdditionalData from '@/workflow-execute-additional-data';

import { saveCredential } from '../shared/db/credentials';
import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

describe('DynamicNodeParametersController', () => {
	const additionalData = mock<IWorkflowExecuteAdditionalData>();

	const testServer = setupTestServer({ endpointGroups: ['dynamic-node-parameters'] });
	let ownerAgent: SuperAgentTest;
	let service: DynamicNodeParametersService;

	beforeAll(() => {
		service = Container.get(DynamicNodeParametersService);
	});

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(AdditionalData, 'getBase').mockResolvedValue(additionalData);
	});

	afterEach(() => {
		jest.restoreAllMocks();
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

			jest.spyOn(service, 'getOptionsViaMethodName').mockResolvedValue([]);

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
			jest.spyOn(service, 'getOptionsViaLoadOptionsByPath').mockResolvedValue(expectedResult);

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
			jest.spyOn(service, 'getResourceLocatorResults').mockResolvedValue(expectedResult);

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

			jest.spyOn(service, 'getResourceLocatorResults').mockResolvedValue({ results: [] });

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
			jest.spyOn(service, 'getResourceMappingFields').mockResolvedValue(expectedResult);

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
			jest.spyOn(service, 'getLocalResourceMappingFields').mockResolvedValue(expectedResult);

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

	describe('POST /dynamic-node-parameters/local-resource-mapper-fields workflow access', () => {
		const triggerType = 'n8n-nodes-base.executeWorkflowTrigger';

		const requestFor = (workflowId: string, topLevelWorkflowId?: string) => ({
			...commonRequestParams,
			methodName: 'loadSubWorkflowInputs',
			path: 'parameters.workflowInputs',
			...(topLevelWorkflowId ? { workflowId: topLevelWorkflowId } : {}),
			currentNodeParameters: {
				workflowId: { __rl: true, value: workflowId, mode: 'id' },
			},
		});

		const createSubWorkflow = async (owner: User | Project) =>
			await createWorkflow(
				{
					nodes: [
						{
							id: 'trigger',
							name: 'Trigger',
							type: triggerType,
							typeVersion: 1.1,
							position: [0, 0],
							parameters: {},
						},
					],
				},
				owner,
			);

		beforeEach(async () => {
			await testDb.truncate(['SharedWorkflow', 'WorkflowEntity']);

			jest
				.spyOn(AdditionalData, 'getBase')
				.mockImplementation(async ({ currentNodeParameters } = {}) =>
					mock<IWorkflowExecuteAdditionalData>({ currentNodeParameters }),
				);

			// Report the loaded trigger node, so a response shows whether the workflow was read.
			const localResourceMapping = async function (this: ILocalLoadOptionsFunctions) {
				const context = await this.getWorkflowNodeContext(triggerType);
				return {
					fields: context
						? [
								{
									id: context.getNode().id,
									displayName: 'Trigger',
									required: false,
									defaultMatch: false,
									display: true,
								},
							]
						: [],
				};
			};
			jest.spyOn(Container.get(NodeTypes), 'getByNameAndVersion').mockReturnValue(
				mock<INodeType>({
					description: { properties: [] },
					methods: { localResourceMapping: { loadSubWorkflowInputs: localResourceMapping } },
				}),
			);
		});

		it('should load a workflow in the user’s own project', async () => {
			const member = await createMember();
			const workflow = await createSubWorkflow(member);

			const response = await testServer
				.authAgentFor(member)
				.post('/dynamic-node-parameters/local-resource-mapper-fields')
				.send(requestFor(workflow.id))
				.expect(200);

			expect(response.body.data.fields).toEqual([expect.objectContaining({ id: 'trigger' })]);
		});

		it('should load a workflow from a project the user is a member of', async () => {
			const project = await createTeamProject();
			const member = await createMember();
			await linkUserToProject(member, project, 'project:viewer');
			const workflow = await createSubWorkflow(project);

			const response = await testServer
				.authAgentFor(member)
				.post('/dynamic-node-parameters/local-resource-mapper-fields')
				.send(requestFor(workflow.id))
				.expect(200);

			expect(response.body.data.fields).toEqual([expect.objectContaining({ id: 'trigger' })]);
		});

		it('should respond for a workflow the user cannot read the same as for a missing workflow', async () => {
			const owner = await createOwner();
			const member = await createMember();
			const workflow = await createSubWorkflow(owner);
			const memberAgent = testServer.authAgentFor(member);

			const inaccessible = await memberAgent
				.post('/dynamic-node-parameters/local-resource-mapper-fields')
				.send(requestFor(workflow.id))
				.expect(500);
			const missing = await memberAgent
				.post('/dynamic-node-parameters/local-resource-mapper-fields')
				.send(requestFor('missingWorkflow1'))
				.expect(500);

			expect(inaccessible.body.message).toBe(`Failed to find workflow with ID "${workflow.id}"`);
			expect(missing.body.message).toBe('Failed to find workflow with ID "missingWorkflow1"');
		});

		it('should check the referenced workflow even when the request names an accessible workflow', async () => {
			const owner = await createOwner();
			const member = await createMember();
			const ownWorkflow = await createSubWorkflow(member);
			const otherWorkflow = await createSubWorkflow(owner);

			await testServer
				.authAgentFor(member)
				.post('/dynamic-node-parameters/local-resource-mapper-fields')
				.send(requestFor(otherWorkflow.id, ownWorkflow.id))
				.expect(500);
		});

		it('should load any workflow for the instance owner', async () => {
			const owner = await createOwner();
			const member = await createMember();
			const workflow = await createSubWorkflow(member);

			const response = await testServer
				.authAgentFor(owner)
				.post('/dynamic-node-parameters/local-resource-mapper-fields')
				.send(requestFor(workflow.id))
				.expect(200);

			expect(response.body.data.fields).toEqual([expect.objectContaining({ id: 'trigger' })]);
		});
	});

	describe('POST /dynamic-node-parameters/action-result', () => {
		it('should return action result with handler', async () => {
			const owner = await createOwner();
			ownerAgent = testServer.authAgentFor(owner);

			const expectedResult: NodeParameterValueType = { test: true };
			jest.spyOn(service, 'getActionResult').mockResolvedValue(expectedResult);

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

			jest.spyOn(service, 'getOptionsViaMethodName').mockResolvedValue([]);

			const { status } = await memberAgent.post('/dynamic-node-parameters/options').send({
				...commonRequestParams,
				methodName: 'testMethod',
				credentials: { httpBasicAuth: { id: ownCredential.id, name: ownCredential.name } },
			});

			expect(status).not.toBe(403);
		});

		it('should not return 403 when no credentials are supplied', async () => {
			jest.spyOn(service, 'getOptionsViaMethodName').mockResolvedValue([]);

			const { status } = await memberAgent.post('/dynamic-node-parameters/options').send({
				...commonRequestParams,
				methodName: 'testMethod',
			});

			expect(status).not.toBe(403);
		});
	});
});
