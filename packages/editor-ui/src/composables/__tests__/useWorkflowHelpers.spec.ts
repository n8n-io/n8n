import type { IWorkflowDataUpdate } from '@/Interface';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import router from '@/router';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useWorkflowsEEStore } from '@/stores/workflows.ee.store';
import { useTagsStore } from '@/stores/tags.store';
import { createTestWorkflow } from '@/__tests__/mocks';

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
