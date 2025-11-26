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
				mode: 'activate',
				userId: user.id,
			});

			const record = await repository.findOne({
				where: { workflowId: workflow.id },
			});

			expect(record).toMatchObject({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				status: 'activated',
				mode: 'activate',
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
				mode: 'activate',
				userId: null,
			});

			const record = await repository.findOne({
				where: { workflowId: workflow.id },
			});

			expect(record).toMatchObject({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				status: 'activated',
				mode: 'activate',
				userId: null,
			});
		});

		it('should create a record with null mode', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const workflow = await createWorkflowWithHistory();

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				status: 'deactivated',
				mode: null,
				userId: null,
			});

			const record = await repository.findOne({
				where: { workflowId: workflow.id },
			});

			expect(record).toMatchObject({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				status: 'deactivated',
				mode: null,
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
				mode: 'activate',
				userId: null,
			});

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: id1,
				status: 'deactivated',
				mode: 'update',
				userId: null,
			});

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: id2,
				status: 'activated',
				mode: 'update',
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
				mode: 'activate',
			});
			expect(records[1]).toMatchObject({
				versionId: id1,
				status: 'deactivated',
				mode: 'update',
			});
			expect(records[2]).toMatchObject({
				versionId: id2,
				status: 'activated',
				mode: 'update',
			});
		});
	});

	describe('getLastActivatedVersion', () => {
		it('should return the last activated version with mode=activate', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const workflow = await createWorkflow();
			await createWorkflowHistory({ ...workflow, versionId: id1 });
			await createWorkflowHistory({ ...workflow, versionId: id2 });

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: id1,
				status: 'activated',
				mode: 'activate',
				userId: null,
			});

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: id2,
				status: 'activated',
				mode: 'activate',
				userId: null,
			});

			const result = await repository.getLastActivatedVersion(workflow.id);

			expect(result).toMatchObject({
				versionId: id2,
			});
		});

		it('should return null if workflow was never activated', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const workflow = await createWorkflow();

			const result = await repository.getLastActivatedVersion(workflow.id);

			expect(result).toBeNull();
		});

		it('should ignore deactivation records', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const workflow = await createWorkflow();
			await createWorkflowHistory({ ...workflow, versionId: id1 });
			await createWorkflowHistory({ ...workflow, versionId: id2 });

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: id1,
				status: 'activated',
				mode: 'activate',
				userId: null,
			});

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: id2,
				status: 'deactivated',
				mode: 'deactivate',
				userId: null,
			});

			const result = await repository.getLastActivatedVersion(workflow.id);

			expect(result).toMatchObject({
				versionId: id1,
			});
		});
	});

	describe('getPublishedVersions', () => {
		it('should return all activated versions (both activate and update modes)', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const workflow = await createWorkflow();
			await createWorkflowHistory({ ...workflow, versionId: id1 });
			await createWorkflowHistory({ ...workflow, versionId: id2 });

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: id1,
				status: 'activated',
				mode: 'activate',
				userId: null,
			});

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: id2,
				status: 'activated',
				mode: 'update',
				userId: null,
			});

			const results = await repository.getPublishedVersions(workflow.id);

			expect(results).toHaveLength(2);
			expect(results.map((r) => r.versionId)).toContain(id1);
			expect(results.map((r) => r.versionId)).toContain(id2);
		});

		it('should not return deactivated versions', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const workflow = await createWorkflowWithHistory();

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				status: 'activated',
				mode: 'activate',
				userId: null,
			});

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				status: 'deactivated',
				mode: 'deactivate',
				userId: null,
			});

			const results = await repository.getPublishedVersions(workflow.id);

			expect(results).toHaveLength(1);
			expect(results[0]).toMatchObject({
				versionId: workflow.versionId,
			});
		});

		it('should return user when includeUser is true', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const user = await createUser();
			const workflow = await createWorkflowWithHistory();

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				status: 'activated',
				mode: 'activate',
				userId: user.id,
			});

			const results = await repository.getPublishedVersions(workflow.id, true);

			expect(results).toHaveLength(1);
			expect(results[0].user).toBeDefined();
			expect(results[0].user?.id).toBe(user.id);
		});

		it('should not return user when includeUser is false', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const user = await createUser();
			const workflow = await createWorkflowWithHistory();

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				status: 'activated',
				mode: 'activate',
				userId: user.id,
			});

			const results = await repository.getPublishedVersions(workflow.id, false);

			expect(results).toHaveLength(1);
			expect(results[0].user).toBeUndefined();
		});

		it('should return empty array if no published versions exist', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const workflow = await createWorkflow();

			const results = await repository.getPublishedVersions(workflow.id);

			expect(results).toEqual([]);
		});

		it('should handle multiple workflows independently', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const workflow1 = await createWorkflowWithHistory();
			const workflow2 = await createWorkflowWithHistory();

			await repository.addRecord({
				workflowId: workflow1.id,
				versionId: workflow1.versionId,
				status: 'activated',
				mode: 'activate',
				userId: null,
			});

			await repository.addRecord({
				workflowId: workflow2.id,
				versionId: workflow2.versionId,
				status: 'activated',
				mode: 'activate',
				userId: null,
			});

			const results1 = await repository.getPublishedVersions(workflow1.id);
			const results2 = await repository.getPublishedVersions(workflow2.id);

			expect(results1).toHaveLength(1);
			expect(results1[0].versionId).toBe(workflow1.versionId);

			expect(results2).toHaveLength(1);
			expect(results2[0].versionId).toBe(workflow2.versionId);
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
				mode: 'activate',
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
				mode: 'activate',
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
				mode: 'activate',
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
