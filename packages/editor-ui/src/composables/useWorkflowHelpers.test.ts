import type { IWorkflowDataUpdate, IWorkflowDb } from '@/Interface';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import router from '@/router';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

const inputWorkflowData: IWorkflowDataUpdate = {
	name: 'My workflow 9 copy',
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
	],
	connections: {},
	settings: {
		executionOrder: 'v1',
	},
	meta: {
		templateCredsSetupCompleted: true,
	},
	pinData: {},
	versionId: '20c24e55-5756-4b55-b63e-c18c0cf56537',
	tags: [],
};

const newWorkflowData: IWorkflowDb = {
	createdAt: '2024-05-27T14:20:51.177Z',
	updatedAt: '2024-05-27T14:20:51.177Z',
	id: 'HQ9KIBzVl5FvHfB2',
	name: 'My workflow 9 copy',
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
	],
	connections: {},
	settings: {
		executionOrder: 'v1',
	},
	meta: {
		templateCredsSetupCompleted: true,
	},
	pinData: {},
	versionId: '1d601560-b15f-42d1-84ac-9b572262dfff',
	tags: [],
	sharedWithProjects: [],
	usedCredentials: [],
	scopes: [
		'workflow:create',
		'workflow:delete',
		'workflow:execute',
		'workflow:list',
		'workflow:read',
		'workflow:share',
		'workflow:update',
	],
};

vi.mock('@/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
		workflowsById: {},
		createNewWorkflow: vi.fn((workflowData: IWorkflowDataUpdate) => {
			return newWorkflowData;
		}),
		addWorkflow: vi.fn((workflow: IWorkflowDb) => {}),
		setActive: vi.fn(() => {}),
		setWorkflowId: vi.fn(() => {}),
		setWorkflowVersionId: vi.fn(() => {}),
		setWorkflowName: vi.fn(() => {}),
		setWorkflowSettings: vi.fn(() => {}),
		setNodeValue: vi.fn(() => {}),
		setWorkflowTagIds: vi.fn(() => {}),
		getCurrentWorkflow: vi.fn(() => ({})),
	})),
}));

describe('useWorkflowHelpers', () => {
	describe('saveAsNewWorkflow', () => {
		beforeAll(() => {
			setActivePinia(createTestingPinia());
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('should save the current workflow as a new workflow', async () => {
			const { saveAsNewWorkflow } = useWorkflowHelpers({ router });

			const saved = await saveAsNewWorkflow({
				name: inputWorkflowData.name,
				resetWebhookUrls: true,
				data: inputWorkflowData,
			});

			expect(saved).toEqual(true);
		});
	});
});
