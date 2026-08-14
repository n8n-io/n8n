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

			await new Promise((resolve) => setTimeout(resolve, 5));

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: id1,
				event: 'deactivated',
				userId: null,
			});

			await new Promise((resolve) => setTimeout(resolve, 5));

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

	describe('findActivatedByUserId', () => {
		it('should return the userId of the most recent activated event', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const user1 = await createUser();
			const user2 = await createUser();
			const workflow = await createWorkflowWithHistory();

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				event: 'activated',
				userId: user1.id,
			});

			await new Promise((resolve) => setTimeout(resolve, 5));

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				event: 'activated',
				userId: user2.id,
			});

			const result = await repository.findActivatedByUserId(workflow.id);

			expect(result).toBe(user2.id);
		});

		it('should return undefined when no activated event exists', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const workflow = await createWorkflowWithHistory();

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				event: 'deactivated',
				userId: null,
			});

			const result = await repository.findActivatedByUserId(workflow.id);

			expect(result).toBeUndefined();
		});

		it('should return undefined when userId is null on the activated record', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);
			const workflow = await createWorkflowWithHistory();

			await repository.addRecord({
				workflowId: workflow.id,
				versionId: workflow.versionId,
				event: 'activated',
				userId: null,
			});

			const result = await repository.findActivatedByUserId(workflow.id);

			expect(result).toBeUndefined();
		});

		it('should return undefined for a non-existent workflowId', async () => {
			const repository = Container.get(WorkflowPublishHistoryRepository);

			const result = await repository.findActivatedByUserId('non-existent-id');

			expect(result).toBeUndefined();
		});
	});

	describe('getVersionPublicationStates', () => {
		const repository = () => Container.get(WorkflowPublishHistoryRepository);

		/** Workflow-history createdAt drives the "later version" rule, so space the rows out. */
		const addVersion = async (workflow: Awaited<ReturnType<typeof createWorkflow>>) => {
			const versionId = uuid();
			await createWorkflowHistory({ ...workflow, versionId });
			await new Promise((resolve) => setTimeout(resolve, 10));
			return versionId;
		};

		const activate = async (workflowId: string, versionId: string) => {
			await repository().addRecord({ workflowId, versionId, event: 'activated', userId: null });
		};

		const deactivate = async (workflowId: string, versionId: string) => {
			await repository().addRecord({ workflowId, versionId, event: 'deactivated', userId: null });
		};

		const stateOf = async (workflowId: string, versionId: string) => {
			const states = await repository().getVersionPublicationStates(workflowId, [versionId]);
			return states.get(versionId);
		};

		it('returns published when the version itself was activated', async () => {
			const workflow = await createWorkflow();
			const versionId = await addVersion(workflow);
			await activate(workflow.id, versionId);

			await expect(stateOf(workflow.id, versionId)).resolves.toBe('published');
		});

		it('returns published even after a later deactivation', async () => {
			const workflow = await createWorkflow();
			const versionId = await addVersion(workflow);
			await activate(workflow.id, versionId);
			await deactivate(workflow.id, versionId);

			await expect(stateOf(workflow.id, versionId)).resolves.toBe('published');
		});

		it('returns not_published when nothing was ever activated', async () => {
			const workflow = await createWorkflow();
			const versionId = await addVersion(workflow);

			await expect(stateOf(workflow.id, versionId)).resolves.toBe('not_published');
		});

		it('returns superseded when a later-created version was activated', async () => {
			const workflow = await createWorkflow();
			const versionId = await addVersion(workflow);
			const laterVersionId = await addVersion(workflow);
			await activate(workflow.id, laterVersionId);

			await expect(stateOf(workflow.id, versionId)).resolves.toBe('superseded');
		});

		it('returns superseded even after the later version was deactivated', async () => {
			const workflow = await createWorkflow();
			const versionId = await addVersion(workflow);
			const laterVersionId = await addVersion(workflow);
			await activate(workflow.id, laterVersionId);
			await deactivate(workflow.id, laterVersionId);

			await expect(stateOf(workflow.id, versionId)).resolves.toBe('superseded');
		});

		it('returns not_published when only an earlier-created version was activated', async () => {
			const workflow = await createWorkflow();
			const earlierVersionId = await addVersion(workflow);
			const versionId = await addVersion(workflow);
			await activate(workflow.id, earlierVersionId);

			await expect(stateOf(workflow.id, versionId)).resolves.toBe('not_published');
		});

		it('ignores activations of another workflow', async () => {
			const workflow = await createWorkflow();
			const versionId = await addVersion(workflow);
			const otherWorkflow = await createWorkflow();
			const otherVersionId = await addVersion(otherWorkflow);
			await activate(otherWorkflow.id, otherVersionId);

			await expect(stateOf(workflow.id, versionId)).resolves.toBe('not_published');
		});

		it('returns unknown when the pinned history row was pruned', async () => {
			const workflow = await createWorkflow();
			const versionId = await addVersion(workflow);
			await Container.get(WorkflowHistoryRepository).delete({ versionId });

			await expect(stateOf(workflow.id, versionId)).resolves.toBe('unknown');
		});

		it('resolves each requested version independently in one call', async () => {
			const workflow = await createWorkflow();
			const publishedVersionId = await addVersion(workflow);
			const supersededVersionId = await addVersion(workflow);
			const activatedVersionId = await addVersion(workflow);
			const prunedVersionId = await addVersion(workflow);
			await activate(workflow.id, publishedVersionId);
			await activate(workflow.id, activatedVersionId);
			await Container.get(WorkflowHistoryRepository).delete({ versionId: prunedVersionId });

			const states = await repository().getVersionPublicationStates(workflow.id, [
				publishedVersionId,
				supersededVersionId,
				prunedVersionId,
			]);

			expect(states.get(publishedVersionId)).toBe('published');
			expect(states.get(supersededVersionId)).toBe('superseded');
			expect(states.get(prunedVersionId)).toBe('unknown');
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

		it('should set null when workflow history version is deleted', async () => {
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

			expect(records).toHaveLength(1);
			expect(records[0]).toEqual(
				expect.objectContaining({
					workflowId: workflow.id,
					versionId: null,
					event: 'activated',
					userId: null,
				}),
			);
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
