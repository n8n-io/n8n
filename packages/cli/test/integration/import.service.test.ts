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
	WorkflowPublishHistoryRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import type { ActiveWorkflowManager } from '@/active-workflow-manager';
import type { WorkflowIndexService } from '@/modules/workflow-index/workflow-index.service';
import { ImportService } from '@/services/import.service';

import { createMember, createOwner } from './shared/db/users';

describe('ImportService', () => {
	let importService: ImportService;
	let tagRepository: TagRepository;
	let owner: User;
	let ownerPersonalProject: Project;
	let mockActiveWorkflowManager: ActiveWorkflowManager;
	let mockWorkflowIndexService: WorkflowIndexService;

	let workflowRepository: WorkflowRepository;
	let sharedWorkflowRepository: SharedWorkflowRepository;
	let workflowHistoryRepository: WorkflowHistoryRepository;
	let workflowPublishHistoryRepository: WorkflowPublishHistoryRepository;

	beforeAll(async () => {
		await testDb.init();

		workflowRepository = Container.get(WorkflowRepository);
		sharedWorkflowRepository = Container.get(SharedWorkflowRepository);
		workflowHistoryRepository = Container.get(WorkflowHistoryRepository);
		workflowPublishHistoryRepository = Container.get(WorkflowPublishHistoryRepository);

		owner = await createOwner();
		ownerPersonalProject = await getPersonalProject(owner);

		tagRepository = Container.get(TagRepository);

		const credentialsRepository = Container.get(CredentialsRepository);

		mockActiveWorkflowManager = mock<ActiveWorkflowManager>();

		mockWorkflowIndexService = mock<WorkflowIndexService>();

		importService = new ImportService(
			mock(),
			credentialsRepository,
			tagRepository,
			mock(),
			mock(),
			mockActiveWorkflowManager,
			mockWorkflowIndexService,
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

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);

		const dbWorkflow = await getWorkflowById(workflowToImport.id);

		if (!dbWorkflow) fail('Expected to find workflow');

		expect(dbWorkflow.id).toBe(workflowToImport.id);
		expect(mockWorkflowIndexService.updateIndexForDraft).toHaveBeenCalledWith(workflowToImport);
	});

	test('should make user owner of imported workflow', async () => {
		const workflowToImport = newWorkflow();

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);

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

		await importService.importWorkflows([workflowToImport], memberPersonalProject.id);

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

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);

		const dbWorkflow = await getWorkflowById(workflowToImport.id);

		if (!dbWorkflow) fail('Expected to find workflow');

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

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);

		const dbWorkflow = await getWorkflowById(workflowToImport.id);

		if (!dbWorkflow) fail('Expected to find workflow');

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

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);

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

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);

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

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);

		const dbWorkflow = await workflowRepository.findOneOrFail({
			where: { id: workflowToImport.id },
			relations: ['tags'],
		});

		if (!dbWorkflow.tags) fail('No tags found on workflow');

		expect(dbWorkflow.tags.at(0)?.name).toBe(tag.name); // workflow tagged

		const dbTag = await tagRepository.findOneOrFail({ where: { name: tag.name } });

		expect(dbTag.name).toBe(tag.name); // tag created
	});

	test('should remove workflow from ActiveWorkflowManager when workflow has ID', async () => {
		const workflowWithId = await createActiveWorkflow();
		await importService.importWorkflows([workflowWithId], ownerPersonalProject.id);

		expect(mockActiveWorkflowManager.remove).toHaveBeenCalledWith(workflowWithId.id);
	});

	test('should always create a record in workflow history', async () => {
		const workflowToImport = newWorkflow();

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);

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

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);

		const workflowHistoryRecords = await workflowHistoryRepository.find({
			where: {
				workflowId: workflowToImport.id,
			},
		});

		expect(workflowHistoryRecords).toHaveLength(1);
		expect(workflowHistoryRecords[0].name).toBe('Historical Workflow Name');
		expect(workflowHistoryRecords[0].description).toBe('Historical workflow description');
	});

	test('should create a record in workflow publish history if active version exists', async () => {
		// Create an existing active workflow in the database first
		const existingWorkflow = await createActiveWorkflow();
		const originalActiveVersionId = existingWorkflow.activeVersionId!;

		// Now import it again (simulating re-import of an active workflow)
		const workflowToImport = await getWorkflowById(existingWorkflow.id);
		if (!workflowToImport) fail('Expected to find workflow');

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);

		const publishHistoryRecords = await workflowPublishHistoryRepository.find({
			where: {
				workflowId: existingWorkflow.id,
				event: 'deactivated',
			},
		});

		// Should have publish history for deactivating the original active version
		expect(publishHistoryRecords).toHaveLength(1);
		expect(publishHistoryRecords[0].versionId).toBe(originalActiveVersionId);
	});

	test('should not create a record in workflow publish history for new workflows', async () => {
		const workflowToImport = newWorkflow();
		workflowToImport.active = true;
		workflowToImport.activeVersionId = 'some-version';

		if (!workflowToImport) fail('Expected to find workflow');

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);

		const publishHistoryRecords = await workflowPublishHistoryRepository.find({
			where: {
				workflowId: workflowToImport.id,
				event: 'deactivated',
			},
		});

		expect(publishHistoryRecords).toHaveLength(0);
	});

	test('should always generate a new versionId when importing, ensuring proper history ordering', async () => {
		const initialWorkflow = await createWorkflowWithHistory();
		const originalVersionId = initialWorkflow.versionId;

		// Import the same workflow again (simulating re-import)
		const workflowToReimport = await getWorkflowById(initialWorkflow.id);
		if (!workflowToReimport) fail('Expected to find workflow');

		await importService.importWorkflows([workflowToReimport], ownerPersonalProject.id);

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
});
