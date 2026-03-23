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
import { v4 as uuid } from 'uuid';

import { createUser } from '../../shared/db/users';

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
			const id1 = uuid();

			const repository = Container.get(WorkflowPublishHistoryRepository);
			const user = await createUser();
			const workflow = await createWorkflowWithHistory({ versionId: id1 });

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				event: 'activated',
				userId: user.id,
			});

			const record = await repository.findOne({
				where: { workflowId: workflow.id },
			});

			expect(record).toMatchObject({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				event: 'activated',

				userId: user.id,
			});
			expect(record?.createdAt).toBeInstanceOf(Date);
		});

		it('should create a record with null userId', async () => {
			const id1 = uuid();

			const repository = Container.get(WorkflowPublishHistoryRepository);
			const workflow = await createWorkflowWithHistory({ versionId: id1 });

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				event: 'activated',
				userId: null,
			});

			const record = await repository.findOne({
				where: { workflowId: workflow.id },
			});

			expect(record).toMatchObject({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				event: 'activated',
				userId: null,
			});
		});

		it('should create multiple records for same workflow', async () => {
			const id1 = uuid();
			const id2 = uuid();

			const repository = Container.get(WorkflowPublishHistoryRepository);
			const workflow = await createWorkflow();
			await createWorkflowHistory({ ...workflow, versionId: id1 });
			await createWorkflowHistory({ ...workflow, versionId: id2 });

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: id1,
				event: 'activated',
				userId: null,
			});

			await new Promise((resolve) => setTimeout(resolve, 1));

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: id1,
				event: 'deactivated',
				userId: null,
			});

			await new Promise((resolve) => setTimeout(resolve, 1));

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: id2,
				event: 'activated',
				userId: null,
			});

			const records = await repository.find({
				where: { workflowId: workflow.id },
				order: { createdAt: 'ASC' },
			});

			expect(records).toHaveLength(3);
			expect(records[0]).toMatchObject({
				versionId: id1,
				event: 'activated',
			});
			expect(records[1]).toMatchObject({
				versionId: id1,
				event: 'deactivated',
			});
			expect(records[2]).toMatchObject({
				versionId: id2,
				event: 'activated',
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
				event: 'activated',
				userId: null,
			});

			await workflowRepository.delete(workflow.id);

			const records = await repository.find({
				where: { workflowId: workflow.id },
			});

			expect(records).toHaveLength(0);
		});

		it('should cascade delete when workflow history version is deleted', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const workflow = await createWorkflowWithHistory();

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				event: 'activated',
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
				event: 'activated',
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
