import {
	createWorkflow,
	createWorkflowHistory,
	createWorkflowWithHistory,
	testDb,
} from '@n8n/backend-test-utils';
import {
	UserRepository,
	WorkflowHistoryRepository,
	WorkflowPublishHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { createUser } from '../../shared/db/users';

const id1 = '5ef472d2-9253-452c-b0fe-8eb78fb3c43b';
const id2 = 'bf36ce2c-baf6-4b51-9f01-065c76d5cb0c';

describe('WorkflowPublishHistoryRepository', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowPublishHistory', 'WorkflowHistory', 'WorkflowEntity', 'User']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('addRecord', () => {
		it('should create a publish history record with all fields', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const user = await createUser();
			const workflow = await createWorkflowWithHistory({ versionId: id1 });

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				status: 'activated',

				userId: user.id,
			});

			const record = await repository.findOne({
				where: { workflowId: workflow.id },
			});

			expect(record).toMatchObject({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				status: 'activated',

				userId: user.id,
			});
			expect(record?.createdAt).toBeInstanceOf(Date);
		});

		it('should create a record with null userId', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const workflow = await createWorkflowWithHistory({ versionId: id1 });

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				status: 'activated',

				userId: null,
			});

			const record = await repository.findOne({
				where: { workflowId: workflow.id },
			});

			expect(record).toMatchObject({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				status: 'activated',

				userId: null,
			});
		});

		it('should create multiple records for same workflow', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const workflow = await createWorkflow();
			await createWorkflowHistory({ ...workflow, versionId: id1 });
			await createWorkflowHistory({ ...workflow, versionId: id2 });

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: id1,
				status: 'activated',
				userId: null,
			});

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: id1,
				status: 'deactivated',
				userId: null,
			});

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: id2,
				status: 'activated',
				userId: null,
			});

			const records = await repository.find({
				where: { workflowId: workflow.id },
				order: { createdAt: 'ASC' },
			});

			expect(records).toHaveLength(3);
			expect(records[0]).toMatchObject({
				versionId: id1,
				status: 'activated',
			});
			expect(records[1]).toMatchObject({
				versionId: id1,
				status: 'deactivated',
			});
			expect(records[2]).toMatchObject({
				versionId: id2,
				status: 'activated',
			});
		});
	});

	describe('Foreign key constraints', () => {
		it('should cascade delete when workflow is deleted', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const workflowRepository = Container.get(WorkflowRepository);
			const workflow = await createWorkflowWithHistory();

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				status: 'activated',

				userId: null,
			});

			await workflowRepository.delete(workflow.id);

			const records = await repository.find({
				where: { workflowId: workflow.id },
			});

			expect(records).toHaveLength(0);
		});

		it('should cascade delete when worklfow history version is deleted', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const workflow = await createWorkflowWithHistory();

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				status: 'activated',

				userId: null,
			});

			await Container.get(WorkflowHistoryRepository).delete({ versionId: workflow.versionId });

			const records = await repository.find({
				where: { workflowId: workflow.id },
			});

			expect(records).toHaveLength(0);
		});

		it('should set userId to null when user is deleted', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const user = await createUser();
			const workflow = await createWorkflowWithHistory();

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				status: 'activated',

				userId: user.id,
			});

			await Container.get(UserRepository).delete(user.id);

			const record = await repository.findOne({
				where: { workflowId: workflow.id },
			});

			expect(record).toBeDefined();
			expect(record?.userId).toBeNull();
		});
	});
});
