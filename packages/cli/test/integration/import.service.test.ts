import {
	getPersonalProject,
	createWorkflow,
	getAllSharedWorkflows,
	getWorkflowById,
	newWorkflow,
	testDb,
	createActiveWorkflow,
	createWorkflowWithHistory,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import {
	TagEntity,
	CredentialsRepository,
	TagRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
	WorkflowHistoryRepository,
	UserRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { WorkflowIndexService } from '@/modules/workflow-index/workflow-index.service';
import { ImportService } from '@/services/import.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { createMember, createOwner } from './shared/db/users';

describe('ImportService', () => {
	let importService: ImportService;
	let tagRepository: TagRepository;
	let owner: User;
	let ownerPersonalProject: Project;
	let mockWorkflowService: Mocked<WorkflowService>;
	let mockWorkflowIndexService: WorkflowIndexService;

	let workflowRepository: WorkflowRepository;
	let sharedWorkflowRepository: SharedWorkflowRepository;
	let workflowHistoryRepository: WorkflowHistoryRepository;

	beforeAll(async () => {
		await testDb.init();

		workflowRepository = Container.get(WorkflowRepository);
		sharedWorkflowRepository = Container.get(SharedWorkflowRepository);
		workflowHistoryRepository = Container.get(WorkflowHistoryRepository);

		owner = await createOwner();
		ownerPersonalProject = await getPersonalProject(owner);

		tagRepository = Container.get(TagRepository);

		const credentialsRepository = Container.get(CredentialsRepository);
		const userRepository = Container.get(UserRepository);

		mockWorkflowService = mock<WorkflowService>();
		mockWorkflowIndexService = mock<WorkflowIndexService>();

		importService = new ImportService(
			mock(),
			credentialsRepository,
			tagRepository,
			mock(),
			mock(),
			mockWorkflowIndexService,
			mock(),
			userRepository,
			mockWorkflowService,
		);
	});

	afterEach(async () => {
		await testDb.truncate([
			'WorkflowEntity',
			'SharedWorkflow',
			'TagEntity',
			'WorkflowTagMapping',
			'WorkflowHistory',
			'WorkflowPublishHistory',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	test('should import credless and tagless workflow', async () => {
		const workflowToImport = await createWorkflow();

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id, owner.id, {});

		const dbWorkflow = await getWorkflowById(workflowToImport.id);

		if (!dbWorkflow) expect.fail('Expected to find workflow');

		expect(dbWorkflow.id).toBe(workflowToImport.id);
		expect(mockWorkflowIndexService.updateIndexForDraft).toHaveBeenCalledWith(workflowToImport);
	});

	test('should make user owner of imported workflow', async () => {
		const workflowToImport = newWorkflow();

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id, owner.id, {});

		const dbSharing = await sharedWorkflowRepository.findOneOrFail({
			where: {
				workflowId: workflowToImport.id,
				projectId: ownerPersonalProject.id,
				role: 'workflow:owner',
			},
		});

		expect(dbSharing.projectId).toBe(ownerPersonalProject.id);
	});

	test('should not change the owner if it already exists', async () => {
		const member = await createMember();
		const memberPersonalProject = await getPersonalProject(member);
		const workflowToImport = await createWorkflow(undefined, owner);

		await importService.importWorkflows([workflowToImport], memberPersonalProject.id, owner.id, {});

		const sharings = await getAllSharedWorkflows();

		expect(sharings).toMatchObject([
			expect.objectContaining({
				workflowId: workflowToImport.id,
				projectId: ownerPersonalProject.id,
				role: 'workflow:owner',
			}),
		]);
	});

	test('should deactivate imported workflow if active', async () => {
		const workflowToImport = await createActiveWorkflow();

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id, owner.id, {});

		const dbWorkflow = await getWorkflowById(workflowToImport.id);

		if (!dbWorkflow) expect.fail('Expected to find workflow');

		expect(dbWorkflow.active).toBe(false);
		expect(dbWorkflow.activeVersionId).toBeNull();
	});

	test('should leave intact new-format credentials', async () => {
		const credential = {
			n8nApi: { id: '123', name: 'n8n API' },
		};

		const nodes: INode[] = [
			{
				id: uuid(),
				name: 'n8n',
				parameters: {},
				position: [0, 0],
				type: 'n8n-nodes-base.n8n',
				typeVersion: 1,
				credentials: credential,
			},
		];

		const workflowToImport = await createWorkflow({ nodes });

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id, owner.id, {});

		const dbWorkflow = await getWorkflowById(workflowToImport.id);

		if (!dbWorkflow) expect.fail('Expected to find workflow');

		expect(dbWorkflow.nodes.at(0)?.credentials).toMatchObject(credential);
	});

	test('should set tag by identical match', async () => {
		const tag = Object.assign(new TagEntity(), {
			id: '123',
			createdAt: new Date(),
			name: 'Test',
		});

		await tagRepository.save(tag); // tag stored

		const workflowToImport = await createWorkflow({ tags: [tag] });

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id, owner.id, {});

		const dbWorkflow = await workflowRepository.findOneOrFail({
			where: { id: workflowToImport.id },
			relations: ['tags'],
		});

		expect(dbWorkflow.tags).toStrictEqual([tag]); // workflow tagged

		const dbTags = await tagRepository.find();

		expect(dbTags).toStrictEqual([tag]); // tag matched
	});

	test('should set tag by name match', async () => {
		const tag = Object.assign(new TagEntity(), { name: 'Test' });

		await tagRepository.save(tag); // tag stored

		const workflowToImport = await createWorkflow({ tags: [tag] });

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id, owner.id, {});

		const dbWorkflow = await workflowRepository.findOneOrFail({
			where: { id: workflowToImport.id },
			relations: ['tags'],
		});

		expect(dbWorkflow.tags).toStrictEqual([tag]); // workflow tagged

		const dbTags = await tagRepository.find();

		expect(dbTags).toStrictEqual([tag]); // tag matched
	});

	test('should set tag by creating if no match', async () => {
		const tag = Object.assign(new TagEntity(), { name: 'Test' }); // tag not stored

		const workflowToImport = await createWorkflow({ tags: [tag] });

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id, owner.id, {});

		const dbWorkflow = await workflowRepository.findOneOrFail({
			where: { id: workflowToImport.id },
			relations: ['tags'],
		});

		if (!dbWorkflow.tags) expect.fail('No tags found on workflow');

		expect(dbWorkflow.tags.at(0)?.name).toBe(tag.name); // workflow tagged

		const dbTag = await tagRepository.findOneOrFail({ where: { name: tag.name } });

		expect(dbTag.name).toBe(tag.name); // tag created
	});

	test('should call WorkflowService.deactivateWorkflow when workflow has ID and is active', async () => {
		const workflowWithId = await createActiveWorkflow();
		await importService.importWorkflows([workflowWithId], ownerPersonalProject.id, owner.id, {});

		expect(mockWorkflowService.deactivateWorkflow).toHaveBeenCalledWith(
			expect.objectContaining({ id: owner.id }),
			workflowWithId.id,
			{ source: 'import' },
		);
	});

	test('should always create a record in workflow history', async () => {
		const workflowToImport = newWorkflow();

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id, owner.id, {});

		const workflowHistoryRecords = await workflowHistoryRepository.find({
			where: {
				workflowId: workflowToImport.id,
			},
		});

		expect(workflowHistoryRecords).toHaveLength(1);
		expect(workflowHistoryRecords[0].versionId).toBeDefined();
		expect(workflowHistoryRecords[0].authors).toBe('import');
		expect(workflowHistoryRecords[0].nodes).toEqual(workflowToImport.nodes);
		expect(workflowHistoryRecords[0].connections).toEqual(workflowToImport.connections);
	});

	test('should preserve versionMetadata name and description when importing', async () => {
		const workflowToImport: any = newWorkflow();
		workflowToImport.versionMetadata = {
			name: 'Historical Workflow Name',
			description: 'Historical workflow description',
		};

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id, owner.id, {});

		const workflowHistoryRecords = await workflowHistoryRepository.find({
			where: {
				workflowId: workflowToImport.id,
			},
		});

		expect(workflowHistoryRecords).toHaveLength(1);
		expect(workflowHistoryRecords[0].name).toBe('Historical Workflow Name');
		expect(workflowHistoryRecords[0].description).toBe('Historical workflow description');
	});

	test('should call WorkflowService.deactivateWorkflow when re-importing an existing active workflow', async () => {
		const existingWorkflow = await createActiveWorkflow();

		const workflowToImport = await getWorkflowById(existingWorkflow.id);
		if (!workflowToImport) expect.fail('Expected to find workflow');

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id, owner.id, {});

		expect(mockWorkflowService.deactivateWorkflow).toHaveBeenCalledWith(
			expect.objectContaining({ id: owner.id }),
			existingWorkflow.id,
			{ source: 'import' },
		);
	});

	test('should not call WorkflowService.deactivateWorkflow for new (non-existing) workflows', async () => {
		mockWorkflowService.deactivateWorkflow.mockClear();

		const workflowToImport = newWorkflow();
		workflowToImport.active = true;
		workflowToImport.activeVersionId = 'some-version';

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id, owner.id, {});

		expect(mockWorkflowService.deactivateWorkflow).not.toHaveBeenCalled();
	});

	test('should always generate a new versionId when importing, ensuring proper history ordering', async () => {
		const initialWorkflow = await createWorkflowWithHistory();
		const originalVersionId = initialWorkflow.versionId;

		// Import the same workflow again (simulating re-import)
		const workflowToReimport = await getWorkflowById(initialWorkflow.id);
		if (!workflowToReimport) expect.fail('Expected to find workflow');

		await importService.importWorkflows(
			[workflowToReimport],
			ownerPersonalProject.id,
			owner.id,
			{},
		);

		const historyRecords = await workflowHistoryRepository.find({
			where: { workflowId: initialWorkflow.id },
			order: { createdAt: 'ASC' },
		});

		expect(historyRecords).toHaveLength(2);
		expect(historyRecords[0].versionId).toBe(originalVersionId);
		expect(historyRecords[1].versionId).not.toBe(originalVersionId);

		// Verify the workflow now has the new versionId
		const updatedWorkflow = await getWorkflowById(initialWorkflow.id);
		expect(updatedWorkflow?.versionId).toBe(historyRecords[1].versionId);
	});

	describe('activeState: fromJson', () => {
		test('should activate imported workflow when JSON has active=true', async () => {
			const workflowToImport = await createWorkflow();
			workflowToImport.active = true;

			await importService.importWorkflows([workflowToImport], ownerPersonalProject.id, owner.id, {
				activeState: 'fromJson',
			});

			expect(mockWorkflowService.activateWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ id: owner.id }),
				workflowToImport.id,
				expect.objectContaining({ source: 'import' }),
			);
		});

		test('should deactivate imported workflow that is updating existing one when JSON has active=false', async () => {
			mockWorkflowService.activateWorkflow.mockClear();

			const existingWorkflow = await createActiveWorkflow();

			const workflowToImport = await getWorkflowById(existingWorkflow.id);
			if (!workflowToImport) expect.fail('Expected to find workflow');
			workflowToImport.active = false;

			await importService.importWorkflows([workflowToImport], ownerPersonalProject.id, owner.id, {
				activeState: 'fromJson',
			});

			const dbWorkflow = await getWorkflowById(workflowToImport.id);
			if (!dbWorkflow) expect.fail('Expected to find workflow');

			expect(dbWorkflow.active).toBe(false);
			expect(dbWorkflow.activeVersionId).toBeNull();
			expect(mockWorkflowService.activateWorkflow).not.toHaveBeenCalled();
		});

		test('should leave imported workflow deactivated when JSON has active=false', async () => {
			mockWorkflowService.activateWorkflow.mockClear();

			const workflowToImport = await createWorkflow();
			workflowToImport.active = false;

			await importService.importWorkflows([workflowToImport], ownerPersonalProject.id, owner.id, {
				activeState: 'fromJson',
			});

			const dbWorkflow = await getWorkflowById(workflowToImport.id);
			if (!dbWorkflow) expect.fail('Expected to find workflow');

			expect(dbWorkflow.active).toBe(false);
			expect(dbWorkflow.activeVersionId).toBeNull();
			expect(mockWorkflowService.activateWorkflow).not.toHaveBeenCalled();
		});

		test('should call both deactivateWorkflow and activateWorkflow when re-importing an active workflow', async () => {
			mockWorkflowService.deactivateWorkflow.mockClear();
			mockWorkflowService.activateWorkflow.mockClear();

			const existingWorkflow = await createActiveWorkflow();

			const workflowToImport = await getWorkflowById(existingWorkflow.id);
			if (!workflowToImport) expect.fail('Expected to find workflow');
			workflowToImport.active = true;

			await importService.importWorkflows([workflowToImport], ownerPersonalProject.id, owner.id, {
				activeState: 'fromJson',
			});

			expect(mockWorkflowService.deactivateWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ id: owner.id }),
				existingWorkflow.id,
				{ source: 'import' },
			);
			expect(mockWorkflowService.activateWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ id: owner.id }),
				existingWorkflow.id,
				expect.objectContaining({ source: 'import' }),
			);
		});

		test('should not call WorkflowService.deactivateWorkflow for a brand-new active workflow', async () => {
			mockWorkflowService.deactivateWorkflow.mockClear();
			mockWorkflowService.activateWorkflow.mockClear();

			const workflowToImport = await createWorkflow();
			workflowToImport.active = true;

			await importService.importWorkflows([workflowToImport], ownerPersonalProject.id, owner.id, {
				activeState: 'fromJson',
			});

			expect(mockWorkflowService.deactivateWorkflow).not.toHaveBeenCalled();
			expect(mockWorkflowService.activateWorkflow).toHaveBeenCalledTimes(1);
			expect(mockWorkflowService.activateWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ id: owner.id }),
				workflowToImport.id,
				expect.objectContaining({ source: 'import' }),
			);
		});

		test('should call WorkflowService.deactivateWorkflow exactly once when re-importing an active workflow', async () => {
			mockWorkflowService.deactivateWorkflow.mockClear();
			mockWorkflowService.activateWorkflow.mockClear();

			const existingWorkflow = await createActiveWorkflow();

			const workflowToImport = await getWorkflowById(existingWorkflow.id);
			if (!workflowToImport) expect.fail('Expected to find workflow');
			workflowToImport.active = true;

			await importService.importWorkflows([workflowToImport], ownerPersonalProject.id, owner.id, {
				activeState: 'fromJson',
			});

			expect(mockWorkflowService.deactivateWorkflow).toHaveBeenCalledTimes(1);
			expect(mockWorkflowService.deactivateWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ id: owner.id }),
				existingWorkflow.id,
				{ source: 'import' },
			);
			expect(mockWorkflowService.activateWorkflow).toHaveBeenCalledTimes(1);
			expect(mockWorkflowService.activateWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ id: owner.id }),
				existingWorkflow.id,
				expect.objectContaining({ source: 'import' }),
			);
		});
	});
});
