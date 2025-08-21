import type { IExecutionResponse, IWorkflowDb } from '@/Interface';
import type { WorkflowData } from '@n8n/rest-api-client/api/workflows';
import { resolveParameter, useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useWorkflowsEEStore } from '@/stores/workflows.ee.store';
import { useTagsStore } from '@/stores/tags.store';
import { useUIStore } from '@/stores/ui.store';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
	createTestWorkflowObject,
} from '@/__tests__/mocks';
import { CHAT_TRIGGER_NODE_TYPE, NodeConnectionTypes, WEBHOOK_NODE_TYPE } from 'n8n-workflow';
import type { AssignmentCollectionValue, IConnections } from 'n8n-workflow';
import * as apiWebhooks from '@n8n/rest-api-client/api/webhooks';
import { mockedStore } from '@/__tests__/utils';
import { SLACK_TRIGGER_NODE_TYPE } from '../constants';

describe('useWorkflowHelpers', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let workflowsEEStore: ReturnType<typeof useWorkflowsEEStore>;
	let tagsStore: ReturnType<typeof useTagsStore>;
	let uiStore: ReturnType<typeof useUIStore>;

	beforeAll(() => {
		setActivePinia(createTestingPinia());
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsEEStore = useWorkflowsEEStore();
		tagsStore = useTagsStore();
		uiStore = useUIStore();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('getNodeParametersWithResolvedExpressions', () => {
		it('should correctly detect and resolve expressions in a regular node ', () => {
			const nodeParameters = {
				curlImport: '',
				method: 'GET',
				url: '={{ $json.name }}',
				authentication: 'none',
				provideSslCertificates: false,
				sendQuery: false,
				sendHeaders: false,
				sendBody: false,
				options: {},
				infoMessage: '',
			};
			const workflowHelpers = useWorkflowHelpers();
			const resolvedParameters =
				workflowHelpers.getNodeParametersWithResolvedExpressions(nodeParameters);
			expect(resolvedParameters.url).toHaveProperty('resolvedExpressionValue');
		});

		it('should correctly detect and resolve expressions in a node with assignments (set node) ', () => {
			const nodeParameters = {
				mode: 'manual',
				duplicateItem: false,
				assignments: {
					assignments: [
						{
							id: '25d2d012-089b-424d-bfc6-642982a0711f',
							name: 'date',
							value:
								"={{ DateTime.fromFormat('2023-12-12', 'dd/MM/yyyy').toISODate().plus({7, 'days' }) }}",
							type: 'number',
						},
					],
				},
				includeOtherFields: false,
				options: {},
			};
			const workflowHelpers = useWorkflowHelpers();
			const resolvedParameters =
				workflowHelpers.getNodeParametersWithResolvedExpressions(nodeParameters);
			expect(resolvedParameters).toHaveProperty('assignments');
			const assignments = resolvedParameters.assignments as AssignmentCollectionValue;
			expect(assignments).toHaveProperty('assignments');
			expect(assignments.assignments[0].value).toHaveProperty('resolvedExpressionValue');
		});

		it('should correctly detect and resolve expressions in a node with filter component', () => {
			const nodeParameters = {
				mode: 'rules',
				rules: {
					values: [
						{
							conditions: {
								options: {
									caseSensitive: true,
									leftValue: '',
									typeValidation: 'strict',
									version: 2,
								},
								conditions: [
									{
										leftValue: "={{ $('Edit Fields 1').item.json.name }}",
										rightValue: 12,
										operator: {
											type: 'number',
											operation: 'equals',
										},
									},
								],
								combinator: 'and',
							},
							renameOutput: false,
						},
					],
				},
				looseTypeValidation: false,
				options: {},
			};
			const workflowHelpers = useWorkflowHelpers();
			const resolvedParameters = workflowHelpers.getNodeParametersWithResolvedExpressions(
				nodeParameters,
			) as typeof nodeParameters;
			expect(resolvedParameters).toHaveProperty('rules');
			expect(resolvedParameters.rules).toHaveProperty('values');
			expect(resolvedParameters.rules.values[0].conditions.conditions[0].leftValue).toHaveProperty(
				'resolvedExpressionValue',
			);
		});
		it('should correctly detect and resolve expressions in a node with resource locator component', () => {
			const nodeParameters = {
				authentication: 'oAuth2',
				resource: 'sheet',
				operation: 'read',
				documentId: {
					__rl: true,
					value: "={{ $('Edit Fields').item.json.document }}",
					mode: 'id',
				},
				sheetName: {
					__rl: true,
					value: "={{ $('Edit Fields').item.json.sheet }}",
					mode: 'id',
				},
				filtersUI: {},
				combineFilters: 'AND',
				options: {},
			};
			const workflowHelpers = useWorkflowHelpers();
			const resolvedParameters = workflowHelpers.getNodeParametersWithResolvedExpressions(
				nodeParameters,
			) as typeof nodeParameters;
			expect(resolvedParameters.documentId.value).toHaveProperty('resolvedExpressionValue');
			expect(resolvedParameters.sheetName.value).toHaveProperty('resolvedExpressionValue');
		});
		it('should correctly detect and resolve expressions in a node with resource mapper component', () => {
			const nodeParameters = {
				authentication: 'oAuth2',
				resource: 'sheet',
				operation: 'read',
				documentId: {
					__rl: true,
					value: '1BAjxEhlUu5tXDCMQcjqjguIZDFuct3FYkdo7flxl3yc',
					mode: 'list',
					cachedResultName: 'Mapping sheet',
					cachedResultUrl:
						'https://docs.google.com/spreadsheets/d/1BAjxEhlUu5tXDCMQcjqjguIZDFuct3FYkdo7flxl3yc/edit?usp=drivesdk',
				},
				sheetName: {
					__rl: true,
					value: 'gid=0',
					mode: 'list',
					cachedResultName: 'Users',
					cachedResultUrl:
						'https://docs.google.com/spreadsheets/d/1BAjxEhlUu5tXDCMQcjqjguIZDFuct3FYkdo7flxl3yc/edit#gid=0',
				},
				filtersUI: {
					values: [
						{
							lookupColumn: 'First name',
							lookupValue: "={{ $('Edit Fields 1').item.json.userName }}",
						},
					],
				},
				combineFilters: 'AND',
				options: {},
			};
			const workflowHelpers = useWorkflowHelpers();
			const resolvedParameters = workflowHelpers.getNodeParametersWithResolvedExpressions(
				nodeParameters,
			) as typeof nodeParameters;
			expect(resolvedParameters.filtersUI.values[0].lookupValue).toHaveProperty(
				'resolvedExpressionValue',
			);
		});
	});

	describe('initState', () => {
		it('should initialize workflow state with provided data', () => {
			const { initState } = useWorkflowHelpers();

			const workflowData = createTestWorkflow({
				id: '1',
				name: 'Test Workflow',
				active: true,
				pinData: {},
				meta: {},
				scopes: ['workflow:create'],
				usedCredentials: [],
				sharedWithProjects: [],
				tags: [],
			});
			const addWorkflowSpy = vi.spyOn(workflowsStore, 'addWorkflow');
			const setActiveSpy = vi.spyOn(workflowsStore, 'setActive');
			const setWorkflowIdSpy = vi.spyOn(workflowsStore, 'setWorkflowId');
			const setWorkflowNameSpy = vi.spyOn(workflowsStore, 'setWorkflowName');
			const setWorkflowSettingsSpy = vi.spyOn(workflowsStore, 'setWorkflowSettings');
			const setWorkflowPinDataSpy = vi.spyOn(workflowsStore, 'setWorkflowPinData');
			const setWorkflowVersionIdSpy = vi.spyOn(workflowsStore, 'setWorkflowVersionId');
			const setWorkflowMetadataSpy = vi.spyOn(workflowsStore, 'setWorkflowMetadata');
			const setWorkflowScopesSpy = vi.spyOn(workflowsStore, 'setWorkflowScopes');
			const setUsedCredentialsSpy = vi.spyOn(workflowsStore, 'setUsedCredentials');
			const setWorkflowSharedWithSpy = vi.spyOn(workflowsEEStore, 'setWorkflowSharedWith');
			const setWorkflowTagIdsSpy = vi.spyOn(workflowsStore, 'setWorkflowTagIds');
			const upsertTagsSpy = vi.spyOn(tagsStore, 'upsertTags');

			initState(workflowData);

			expect(addWorkflowSpy).toHaveBeenCalledWith(workflowData);
			expect(setActiveSpy).toHaveBeenCalledWith(true);
			expect(setWorkflowIdSpy).toHaveBeenCalledWith('1');
			expect(setWorkflowNameSpy).toHaveBeenCalledWith({
				newName: 'Test Workflow',
				setStateDirty: false,
			});
			expect(setWorkflowSettingsSpy).toHaveBeenCalledWith({
				executionOrder: 'v1',
				timezone: 'DEFAULT',
			});
			expect(setWorkflowPinDataSpy).toHaveBeenCalledWith({});
			expect(setWorkflowVersionIdSpy).toHaveBeenCalledWith('1');
			expect(setWorkflowMetadataSpy).toHaveBeenCalledWith({});
			expect(setWorkflowScopesSpy).toHaveBeenCalledWith(['workflow:create']);
			expect(setUsedCredentialsSpy).toHaveBeenCalledWith([]);
			expect(setWorkflowSharedWithSpy).toHaveBeenCalledWith({
				workflowId: '1',
				sharedWithProjects: [],
			});
			expect(setWorkflowTagIdsSpy).toHaveBeenCalledWith([]);
			expect(upsertTagsSpy).toHaveBeenCalledWith([]);
		});

		it('should handle missing `usedCredentials` and `sharedWithProjects` gracefully', () => {
			const { initState } = useWorkflowHelpers();

			const workflowData = createTestWorkflow({
				id: '1',
				name: 'Test Workflow',
				active: true,
				pinData: {},
				meta: {},
				scopes: [],
				tags: [],
			});
			const setUsedCredentialsSpy = vi.spyOn(workflowsStore, 'setUsedCredentials');
			const setWorkflowSharedWithSpy = vi.spyOn(workflowsEEStore, 'setWorkflowSharedWith');

			initState(workflowData);

			expect(setUsedCredentialsSpy).not.toHaveBeenCalled();
			expect(setWorkflowSharedWithSpy).not.toHaveBeenCalled();
		});

		it('should handle missing `tags` gracefully', () => {
			const { initState } = useWorkflowHelpers();

			const workflowData = createTestWorkflow({
				id: '1',
				name: 'Test Workflow',
				active: true,
				pinData: {},
				meta: {},
				scopes: [],
			});
			const setWorkflowTagIdsSpy = vi.spyOn(workflowsStore, 'setWorkflowTagIds');
			const upsertTagsSpy = vi.spyOn(tagsStore, 'upsertTags');

			initState(workflowData);

			expect(setWorkflowTagIdsSpy).toHaveBeenCalledWith([]);
			expect(upsertTagsSpy).toHaveBeenCalledWith([]);
		});
	});

	describe('checkConflictingWebhooks', () => {
		it('should return null if no conflicts', async () => {
			const workflowHelpers = useWorkflowHelpers();
			uiStore.stateIsDirty = false;
			vi.spyOn(workflowsStore, 'fetchWorkflow').mockResolvedValue({
				nodes: [],
			} as unknown as IWorkflowDb);
			expect(await workflowHelpers.checkConflictingWebhooks('12345')).toEqual(null);
		});

		it('should return conflicting webhook data and workflow id is different', async () => {
			const workflowHelpers = useWorkflowHelpers();
			uiStore.stateIsDirty = false;
			vi.spyOn(workflowsStore, 'fetchWorkflow').mockResolvedValue({
				nodes: [
					{
						type: WEBHOOK_NODE_TYPE,
						webhookId: '1',
						parameters: {
							method: 'GET',
							path: 'test-path',
						},
					},
				],
			} as unknown as IWorkflowDb);
			vi.spyOn(apiWebhooks, 'findWebhook').mockResolvedValue({
				method: 'GET',
				webhookPath: 'test-path',
				node: 'Webhook 1',
				workflowId: '456',
			});
			expect(await workflowHelpers.checkConflictingWebhooks('123')).toEqual({
				conflict: {
					method: 'GET',
					node: 'Webhook 1',
					webhookPath: 'test-path',
					workflowId: '456',
				},
				trigger: {
					parameters: {
						method: 'GET',
						path: 'test-path',
					},
					type: 'n8n-nodes-base.webhook',
					webhookId: '1',
				},
			});
		});

		it('should return conflicting webhook data and workflow id is different in trigger', async () => {
			const workflowHelpers = useWorkflowHelpers();
			uiStore.stateIsDirty = false;
			vi.spyOn(workflowsStore, 'fetchWorkflow').mockResolvedValue({
				nodes: [
					{
						type: SLACK_TRIGGER_NODE_TYPE,
						webhookId: '1',
						parameters: {},
					},
				],
			} as unknown as IWorkflowDb);
			vi.spyOn(apiWebhooks, 'findWebhook').mockResolvedValue({
				method: 'POST',
				webhookPath: '1/webhook',
				node: 'Webhook 1',
				workflowId: '456',
			});
			expect(await workflowHelpers.checkConflictingWebhooks('123')).toEqual({
				conflict: {
					method: 'POST',
					node: 'Webhook 1',
					webhookPath: '1/webhook',
					workflowId: '456',
				},
				trigger: {
					parameters: {},
					type: SLACK_TRIGGER_NODE_TYPE,
					webhookId: '1',
				},
			});
		});

		it('should return conflicting webhook data and workflow id is different in chat', async () => {
			const workflowHelpers = useWorkflowHelpers();
			uiStore.stateIsDirty = false;
			vi.spyOn(workflowsStore, 'fetchWorkflow').mockResolvedValue({
				nodes: [
					{
						type: CHAT_TRIGGER_NODE_TYPE,
						webhookId: '1',
						parameters: {},
					},
				],
			} as unknown as IWorkflowDb);
			vi.spyOn(apiWebhooks, 'findWebhook').mockResolvedValue({
				method: 'POST',
				webhookPath: '1/chat',
				node: 'Webhook 1',
				workflowId: '456',
			});
			expect(await workflowHelpers.checkConflictingWebhooks('123')).toEqual({
				conflict: {
					method: 'POST',
					node: 'Webhook 1',
					webhookPath: '1/chat',
					workflowId: '456',
				},
				trigger: {
					parameters: {},
					type: CHAT_TRIGGER_NODE_TYPE,
					webhookId: '1',
				},
			});
		});

		it('should return null if webhook already exist but workflow id is the same', async () => {
			const workflowHelpers = useWorkflowHelpers();
			uiStore.stateIsDirty = false;
			vi.spyOn(workflowsStore, 'fetchWorkflow').mockResolvedValue({
				nodes: [
					{
						type: WEBHOOK_NODE_TYPE,
						webhookId: '1',
						parameters: {
							method: 'GET',
							path: 'test-path',
						},
					},
				],
			} as unknown as IWorkflowDb);
			vi.spyOn(apiWebhooks, 'findWebhook').mockResolvedValue({
				method: 'GET',
				webhookPath: 'test-path',
				node: 'Webhook 1',
				workflowId: '123',
			});
			expect(await workflowHelpers.checkConflictingWebhooks('123')).toEqual(null);
		});

		it('should call getWorkflowDataToSave if state is dirty', async () => {
			const workflowHelpers = useWorkflowHelpers();
			uiStore.stateIsDirty = true;
			vi.spyOn(workflowHelpers, 'getWorkflowDataToSave').mockResolvedValue({
				nodes: [],
			} as unknown as WorkflowData);
			expect(await workflowHelpers.checkConflictingWebhooks('12345')).toEqual(null);
		});

		it('should return null if no conflicts with FORM_TRIGGER_NODE_TYPE', async () => {
			const workflowHelpers = useWorkflowHelpers();
			uiStore.stateIsDirty = false;
			vi.spyOn(workflowsStore, 'fetchWorkflow').mockResolvedValue({
				nodes: [
					{
						type: 'n8n-nodes-base.formTrigger',
						parameters: {
							options: {
								path: 'test-path',
							},
						},
						webhookId: '123',
					},
				],
			} as unknown as IWorkflowDb);
			vi.spyOn(apiWebhooks, 'findWebhook').mockResolvedValue(null);
			expect(await workflowHelpers.checkConflictingWebhooks('12345')).toEqual(null);
		});

		it('should return conflicting webhook data and workflow id is different with FORM_TRIGGER_NODE_TYPE', async () => {
			const workflowHelpers = useWorkflowHelpers();
			uiStore.stateIsDirty = false;
			vi.spyOn(workflowsStore, 'fetchWorkflow').mockResolvedValue({
				nodes: [
					{
						type: 'n8n-nodes-base.formTrigger',
						parameters: {
							options: {
								path: 'test-path',
							},
						},
						webhookId: '123',
					},
				],
			} as unknown as IWorkflowDb);
			vi.spyOn(apiWebhooks, 'findWebhook').mockResolvedValue({
				method: 'GET',
				webhookPath: 'test-path',
				node: 'Form Trigger 1',
				workflowId: '456',
			});
			expect(await workflowHelpers.checkConflictingWebhooks('123')).toEqual({
				conflict: {
					method: 'GET',
					node: 'Form Trigger 1',
					webhookPath: 'test-path',
					workflowId: '456',
				},
				trigger: {
					parameters: {
						options: {
							path: 'test-path',
						},
					},
					type: 'n8n-nodes-base.formTrigger',
					webhookId: '123',
				},
			});
		});

		it('should return null if webhook already exist but workflow id is the same with FORM_TRIGGER_NODE_TYPE', async () => {
			const workflowHelpers = useWorkflowHelpers();
			uiStore.stateIsDirty = false;
			vi.spyOn(workflowsStore, 'fetchWorkflow').mockResolvedValue({
				nodes: [
					{
						type: 'n8n-nodes-base.formTrigger',
						parameters: {
							options: {
								path: 'test-path',
							},
						},
						webhookId: '123',
					},
				],
			} as unknown as IWorkflowDb);
			vi.spyOn(apiWebhooks, 'findWebhook').mockResolvedValue({
				method: 'GET',
				webhookPath: 'test-path',
				node: 'Form Trigger 1',
				workflowId: '123',
			});
			expect(await workflowHelpers.checkConflictingWebhooks('123')).toEqual(null);
		});

		it('should return trigger.parameters.path when both trigger.parameters.path and trigger.webhookId are strings', async () => {
			const workflowHelpers = useWorkflowHelpers();
			uiStore.stateIsDirty = false;
			vi.spyOn(workflowsStore, 'fetchWorkflow').mockResolvedValue({
				nodes: [
					{
						type: WEBHOOK_NODE_TYPE,
						parameters: {
							method: 'GET',
							path: 'test-path',
						},
						webhookId: 'test-webhook-id',
					},
				],
			} as unknown as IWorkflowDb);
			const findWebhookSpy = vi.spyOn(apiWebhooks, 'findWebhook');
			findWebhookSpy.mockResolvedValue(null);
			expect(await workflowHelpers.checkConflictingWebhooks('12345')).toEqual(null);
			expect(findWebhookSpy).toBeCalledWith(expect.anything(), {
				method: 'GET',
				path: 'test-path',
			});
			findWebhookSpy.mockRestore();
		});

		it('should return trigger.webhookId when trigger.parameters.path is an empty string', async () => {
			const workflowHelpers = useWorkflowHelpers();
			uiStore.stateIsDirty = false;
			vi.spyOn(workflowsStore, 'fetchWorkflow').mockResolvedValue({
				nodes: [
					{
						type: WEBHOOK_NODE_TYPE,
						parameters: {
							method: 'GET',
							path: '',
						},
						webhookId: 'test-webhook-id',
					},
				],
			} as unknown as IWorkflowDb);
			const findWebhookSpy = vi.spyOn(apiWebhooks, 'findWebhook');
			findWebhookSpy.mockResolvedValue(null);
			expect(await workflowHelpers.checkConflictingWebhooks('12345')).toEqual(null);
			expect(findWebhookSpy).toBeCalledWith(expect.anything(), {
				method: 'GET',
				path: 'test-webhook-id',
			});
			findWebhookSpy.mockRestore();
		});
	});

	describe('executeData', () => {
		it('should return empty execute data if no parent nodes', () => {
			const { executeData } = useWorkflowHelpers();

			const parentNodes: string[] = [];
			const currentNode = 'Set';
			const inputName = 'main';
			const runIndex = 0;

			const result = executeData({}, parentNodes, currentNode, inputName, runIndex);

			expect(result).toEqual({
				node: {},
				data: {},
				source: null,
			});
		});

		it('should return the correct execution data with one parent node', () => {
			const { executeData } = useWorkflowHelpers();

			const parentNodes = ['Start'];
			const currentNode = 'Set';
			const inputName = 'main';
			const runIndex = 0;
			const jsonData = {
				name: 'Test',
			};

			const connectionsBySourceNode: IConnections = {
				Start: {
					main: [[{ node: 'Set', index: 0, type: 'main' }]],
				},
				Set: {
					main: [[{ node: 'Start', index: 0, type: 'main' }]],
				},
			};

			workflowsStore.workflowExecutionData = {
				data: {
					resultData: {
						runData: {
							[parentNodes[0]]: [
								{
									startTime: 0,
									executionTime: 0,
									data: {
										main: [
											{
												json: jsonData,
												index: 0,
											},
										],
									},
									source: [],
								},
							],
						},
					},
				},
			} as unknown as IExecutionResponse;

			const result = executeData(
				connectionsBySourceNode,
				parentNodes,
				currentNode,
				inputName,
				runIndex,
			);

			expect(result).toEqual({
				node: {},
				data: {
					main: [
						{
							index: 0,
							json: jsonData,
						},
					],
				},
				source: {
					main: [
						{
							previousNode: parentNodes[0],
							previousNodeOutput: 0,
							previousNodeRun: 0,
						},
					],
				},
			});
		});

		it('should return the correct execution data with multiple parent nodes, only one with execution data', () => {
			const { executeData } = useWorkflowHelpers();

			const parentNodes = ['Parent A', 'Parent B'];
			const currentNode = 'Set';
			const inputName = 'main';
			const runIndex = 0;
			const jsonData = {
				name: 'Test',
			};

			const connectionsBySourceNode: IConnections = {
				Start: {
					main: [[{ node: 'Set', index: 0, type: 'main' }]],
				},
				Set: {
					main: [[{ node: 'Start', index: 0, type: 'main' }]],
				},
			};

			workflowsStore.workflowExecutionData = {
				data: {
					resultData: {
						runData: {
							[parentNodes[1]]: [
								{
									startTime: 0,
									executionTime: 0,
									data: {
										main: [
											{
												json: jsonData,
												index: 0,
											},
										],
									},
									source: [],
								},
							],
						},
					},
				},
			} as unknown as IExecutionResponse;

			const result = executeData(
				connectionsBySourceNode,
				parentNodes,
				currentNode,
				inputName,
				runIndex,
			);

			expect(result).toEqual({
				node: {},
				data: {
					main: [
						{
							index: 0,
							json: jsonData,
						},
					],
				},
				source: {
					main: [
						{
							previousNode: parentNodes[1],
							previousNodeOutput: undefined,
							previousNodeRun: 0,
						},
					],
				},
			});
		});

		it('should return the correct execution data with multiple parent nodes, all with execution data', () => {
			const { executeData } = useWorkflowHelpers();

			const parentNodes = ['Parent A', 'Parent B'];
			const currentNode = 'Set';
			const inputName = 'main';
			const runIndex = 0;

			const jsonDataA = {
				name: 'Test A',
			};

			const jsonDataB = {
				name: 'Test B',
			};

			const connectionsBySourceNode: IConnections = {
				'Parent A': {
					main: [[{ node: 'Set', type: 'main', index: 0 }]],
				},
				'Parent B': {
					main: [[{ node: 'Set', type: 'main', index: 1 }]],
				},
				Set: {
					main: [
						[{ node: 'Set', type: 'main', index: 0 }],
						[{ node: 'Set', type: 'main', index: 1 }],
					],
				},
			};

			workflowsStore.workflowExecutionData = {
				data: {
					resultData: {
						runData: {
							[parentNodes[0]]: [
								{
									startTime: 0,
									executionTime: 0,
									data: {
										main: [
											{
												json: jsonDataA,
												index: 0,
											},
										],
									},
									source: [],
								},
							],
							[parentNodes[1]]: [
								{
									startTime: 0,
									executionTime: 0,
									data: {
										main: [
											{
												json: jsonDataB,
												index: 0,
											},
										],
									},
									source: [],
								},
							],
						},
					},
				},
			} as unknown as IExecutionResponse;

			const result = executeData(
				connectionsBySourceNode,
				parentNodes,
				currentNode,
				inputName,
				runIndex,
			);

			expect(result).toEqual({
				node: {},
				data: {
					main: [
						{
							index: 0,
							json: jsonDataA,
						},
					],
				},
				source: {
					main: [
						{
							previousNode: parentNodes[0],
							previousNodeOutput: 0,
							previousNodeRun: 0,
						},
					],
				},
			});
		});

		it('should return data from pinnedWorkflowData if available', () => {
			const { executeData } = useWorkflowHelpers();

			const parentNodes = ['ParentNode'];
			const currentNode = 'CurrentNode';
			const inputName = 'main';
			const runIndex = 0;

			workflowsStore.pinnedWorkflowData = {
				ParentNode: [{ json: { key: 'value' } }],
			};
			workflowsStore.shouldReplaceInputDataWithPinData = true;

			const result = executeData({}, parentNodes, currentNode, inputName, runIndex);

			expect(result.data).toEqual({ main: [[{ json: { key: 'value' } }]] });
			expect(result.source).toEqual({ main: [{ previousNode: 'ParentNode' }] });
		});

		it('should return data from getWorkflowRunData if pinnedWorkflowData is not available', () => {
			const { executeData } = useWorkflowHelpers();

			const parentNodes = ['ParentNode'];
			const currentNode = 'CurrentNode';
			const inputName = 'main';
			const runIndex = 0;

			workflowsStore.pinnedWorkflowData = undefined;
			workflowsStore.shouldReplaceInputDataWithPinData = false;
			workflowsStore.getWorkflowRunData = {
				ParentNode: [
					{
						data: { main: [[{ json: { key: 'valueFromRunData' } }]] },
					} as never,
				],
			};

			const connectionsBySourceNode: IConnections = {
				CurrentNode: {
					main: [[{ node: 'CurrentNode', index: 0, type: 'main' }]],
				},
				ParentNode: {
					main: [[{ node: 'CurrentNode', index: 0, type: 'main' }]],
				},
			};

			const result = executeData(
				connectionsBySourceNode,
				parentNodes,
				currentNode,
				inputName,
				runIndex,
			);

			expect(result.data).toEqual({ main: [[{ json: { key: 'valueFromRunData' } }]] });
			expect(result.source).toEqual({
				main: [{ previousNode: 'ParentNode', previousNodeOutput: 0, previousNodeRun: 0 }],
			});
		});
		it('should use provided parentRunIndex ', () => {
			const { executeData } = useWorkflowHelpers();

			const parentNodes = ['ParentNode'];
			const currentNode = 'CurrentNode';
			const inputName = 'main';
			const runIndex = 0;
			const parentRunIndex = 1;

			workflowsStore.pinnedWorkflowData = undefined;
			workflowsStore.shouldReplaceInputDataWithPinData = false;
			workflowsStore.getWorkflowRunData = {
				ParentNode: [
					{ data: {} } as never,
					{
						data: { main: [[{ json: { key: 'valueFromRunData' } }]] },
					} as never,
				],
			};

			const connectionsBySourceNode: IConnections = {
				CurrentNode: {
					main: [[{ node: 'CurrentNode', index: 0, type: 'main' }]],
				},
				ParentNode: {
					main: [[], [{ node: 'CurrentNode', index: 1, type: 'main' }]],
				},
			};

			const result = executeData(
				connectionsBySourceNode,
				parentNodes,
				currentNode,
				inputName,
				runIndex,
				parentRunIndex,
			);

			expect(result.data).toEqual({ main: [[{ json: { key: 'valueFromRunData' } }]] });
			expect(result.source).toEqual({
				main: [{ previousNode: 'ParentNode', previousNodeOutput: 1, previousNodeRun: 1 }],
			});
		});

		it('should return empty data if neither pinnedWorkflowData nor getWorkflowRunData is available', () => {
			const { executeData } = useWorkflowHelpers();

			const parentNodes = ['ParentNode'];
			const currentNode = 'CurrentNode';
			const inputName = 'main';
			const runIndex = 0;

			workflowsStore.pinnedWorkflowData = undefined;
			workflowsStore.shouldReplaceInputDataWithPinData = false;
			workflowsStore.getWorkflowRunData = null;

			const result = executeData({}, parentNodes, currentNode, inputName, runIndex);

			expect(result.data).toEqual({});
			expect(result.source).toBeNull();
		});
	});
});

describe(resolveParameter, () => {
	describe('with local resolve context', () => {
		it('should resolve parameter without execution data', () => {
			const result = resolveParameter(
				{
					f0: '={{ 2 + 2 }}',
					f1: '={{ $vars.foo }}',
					f2: '={{ String($exotic).toUpperCase() }}',
				},
				{
					localResolve: true,
					envVars: {
						foo: 'hello!',
					},
					additionalKeys: {
						$exotic: true,
					},
					workflow: createTestWorkflowObject({
						nodes: [createTestNode({ name: 'n0' })],
					}),
					execution: null,
					nodeName: 'n0',
				},
			);

			expect(result).toEqual({ f0: 4, f1: 'hello!', f2: 'TRUE' });
		});

		it('should resolve parameter with execution data', () => {
			const workflowData = createTestWorkflow({
				nodes: [createTestNode({ name: 'n0' }), createTestNode({ name: 'n1' })],
				connections: {
					n0: {
						[NodeConnectionTypes.Main]: [
							[{ type: NodeConnectionTypes.Main, index: 0, node: 'n1' }],
						],
					},
				},
			});
			const result = resolveParameter(
				{
					f0: '={{ $json }}',
					f1: '={{ $("n0").item.json }}',
				},
				{
					localResolve: true,
					envVars: {},
					additionalKeys: {},
					workflow: createTestWorkflowObject(workflowData),
					execution: createTestWorkflowExecutionResponse({
						workflowData,
						data: {
							resultData: {
								runData: {
									n0: [
										createTestTaskData({
											data: { [NodeConnectionTypes.Main]: [[{ json: { foo: 777 } }]] },
										}),
									],
								},
							},
						},
					}),
					nodeName: 'n1',
					inputNode: { name: 'n0', branchIndex: 0, runIndex: 0 },
				},
			);

			expect(result).toEqual({
				f0: { foo: 777 },
				f1: { foo: 777 },
			});
		});
	});
});
