import { setActivePinia, createPinia } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { IWorkflowDataUpdate } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import { useRootStore } from '../n8nRoot.store';

vi.mock('@/utils/apiUtils', () => ({
	makeRestApiRequest: vi.fn(),
}));

const MOCK_WORKFLOW_SIMPLE: IWorkflowDataUpdate = {
	id: '1',
	name: 'test',
	nodes: [
		{
			parameters: {
				path: '21a77783-e050-4e0f-9915-2d2dd5b53cde',
				options: {},
			},
			id: '2dbf9369-2eec-42e7-9b89-37e50af12289',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 1,
			position: [340, 240],
			webhookId: '21a77783-e050-4e0f-9915-2d2dd5b53cde',
		},
		{
			parameters: {
				table: 'product',
				columns: 'name,ean',
				additionalFields: {},
			},
			name: 'Insert Rows1',
			type: 'n8n-nodes-base.postgres',
			position: [580, 240],
			typeVersion: 1,
			id: 'a10ba62a-8792-437c-87df-0762fa53e157',
			credentials: {
				postgres: {
					id: 'iEFl08xIegmR8xF6',
					name: 'Postgres account',
				},
			},
		},
	],
	connections: {
		Webhook: {
			main: [
				[
					{
						node: 'Insert Rows1',
						type: 'main',
						index: 0,
					},
				],
			],
		},
	},
};

describe('worklfows store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('createNewWorkflow', () => {
		beforeEach(() => {
			vi.resetAllMocks();
		});

		it('creates new workflow', async () => {
			const workflowsStore = useWorkflowsStore();
			await workflowsStore.createNewWorkflow(MOCK_WORKFLOW_SIMPLE);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				useRootStore().getRestApiContext,
				'POST',
				'/workflows',
				{
					...MOCK_WORKFLOW_SIMPLE,
					active: false,
				},
			);
		});

		it('sets active to false', async () => {
			const workflowsStore = useWorkflowsStore();
			await workflowsStore.createNewWorkflow({ ...MOCK_WORKFLOW_SIMPLE, active: true });

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				useRootStore().getRestApiContext,
				'POST',
				'/workflows',
				{
					...MOCK_WORKFLOW_SIMPLE,
					active: false,
				},
			);
		});
	});
});
