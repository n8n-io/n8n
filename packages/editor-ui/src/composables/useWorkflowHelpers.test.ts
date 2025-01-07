import type { IWorkflowDataUpdate } from '@/Interface';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import router from '@/router';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useWorkflowsEEStore } from '@/stores/workflows.ee.store';
import { useTagsStore } from '@/stores/tags.store';
import { createTestWorkflow } from '@/__tests__/mocks';
import type { AssignmentCollectionValue } from 'n8n-workflow';

const getDuplicateTestWorkflow = (): IWorkflowDataUpdate => ({
	name: 'Duplicate webhook test',
	active: false,
	nodes: [
		{
			parameters: {
				path: '5340ae49-2c96-4492-9073-7744d2e52b8a',
				options: {},
			},
			id: 'c1e1b6e7-df13-41b1-95f6-42903b85e438',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [680, 20],
			webhookId: '5340ae49-2c96-4492-9073-7744d2e52b8a',
		},
		{
			parameters: {
				path: 'aa5150d8-1d7d-4247-88d8-44c96fe3a37b',
				options: {},
			},
			id: 'aa5150d8-1d7d-4247-88d8-44c96fe3a37b',
			name: 'Webhook 2',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [700, 40],
			webhookId: 'aa5150d8-1d7d-4247-88d8-44c96fe3a37b',
		},
		{
			parameters: {
				resume: 'webhook',
				options: {
					webhookSuffix: '/test',
				},
			},
			id: '979d8443-51b1-48e2-b239-acf399b66509',
			name: 'Wait',
			type: 'n8n-nodes-base.wait',
			typeVersion: 1.1,
			position: [900, 20],
			webhookId: '5340ae49-2c96-4492-9073-7744d2e52b8a',
		},
	],
	connections: {},
});

describe('useWorkflowHelpers', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let workflowsEEStore: ReturnType<typeof useWorkflowsEEStore>;
	let tagsStore: ReturnType<typeof useTagsStore>;

	beforeAll(() => {
		setActivePinia(createTestingPinia());
		workflowsStore = useWorkflowsStore();
		workflowsEEStore = useWorkflowsEEStore();
		tagsStore = useTagsStore();
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
			const workflowHelpers = useWorkflowHelpers({ router });
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
			const workflowHelpers = useWorkflowHelpers({ router });
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
			const workflowHelpers = useWorkflowHelpers({ router });
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
			const workflowHelpers = useWorkflowHelpers({ router });
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
			const workflowHelpers = useWorkflowHelpers({ router });
			const resolvedParameters = workflowHelpers.getNodeParametersWithResolvedExpressions(
				nodeParameters,
			) as typeof nodeParameters;
			expect(resolvedParameters.filtersUI.values[0].lookupValue).toHaveProperty(
				'resolvedExpressionValue',
			);
		});
	});

	describe('saveAsNewWorkflow', () => {
		it('should respect `resetWebhookUrls: false` when duplicating workflows', async () => {
			const workflow = getDuplicateTestWorkflow();
			if (!workflow.nodes) {
				throw new Error('Missing nodes in test workflow');
			}
			const { saveAsNewWorkflow } = useWorkflowHelpers({ router });
			const webHookIdsPreSave = workflow.nodes.map((node) => node.webhookId);
			const pathsPreSave = workflow.nodes.map((node) => node.parameters.path);

			await saveAsNewWorkflow({
				name: workflow.name,
				resetWebhookUrls: false,
				data: workflow,
			});

			const webHookIdsPostSave = workflow.nodes.map((node) => node.webhookId);
			const pathsPostSave = workflow.nodes.map((node) => node.parameters.path);
			// Expect webhookIds and paths to be the same as in the original workflow
			expect(webHookIdsPreSave).toEqual(webHookIdsPostSave);
			expect(pathsPreSave).toEqual(pathsPostSave);
		});

		it('should respect `resetWebhookUrls: true` when duplicating workflows', async () => {
			const workflow = getDuplicateTestWorkflow();
			if (!workflow.nodes) {
				throw new Error('Missing nodes in test workflow');
			}
			const { saveAsNewWorkflow } = useWorkflowHelpers({ router });
			const webHookIdsPreSave = workflow.nodes.map((node) => node.webhookId);
			const pathsPreSave = workflow.nodes.map((node) => node.parameters.path);

			await saveAsNewWorkflow({
				name: workflow.name,
				resetWebhookUrls: true,
				data: workflow,
			});

			const webHookIdsPostSave = workflow.nodes.map((node) => node.webhookId);
			const pathsPostSave = workflow.nodes.map((node) => node.parameters.path);
			// Now, expect webhookIds and paths to be different
			expect(webHookIdsPreSave).not.toEqual(webHookIdsPostSave);
			expect(pathsPreSave).not.toEqual(pathsPostSave);
		});
	});

	describe('initState', () => {
		it('should initialize workflow state with provided data', () => {
			const { initState } = useWorkflowHelpers({ router });

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
			const { initState } = useWorkflowHelpers({ router });

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
			const { initState } = useWorkflowHelpers({ router });

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
});
