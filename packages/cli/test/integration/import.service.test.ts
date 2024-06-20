import Container from 'typedi';
import { mock } from 'jest-mock-extended';
import { v4 as uuid } from 'uuid';
import type { INode } from 'n8n-workflow';

import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { TagRepository } from '@/databases/repositories/tag.repository';
import { ImportService } from '@/services/import.service';
import { TagEntity } from '@/databases/entities/TagEntity';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { SharedWorkflowRepository } from '@/databases/repositories/sharedWorkflow.repository';

import * as testDb from './shared/testDb';
import { mockInstance } from '../shared/mocking';
import { createMember, createOwner } from './shared/db/users';
import {
	createWorkflow,
	getAllSharedWorkflows,
	getWorkflowById,
	newWorkflow,
} from './shared/db/workflows';

import type { User } from '@db/entities/User';
import type { Project } from '@/databases/entities/Project';
import { getPersonalProject } from './shared/db/projects';

describe('ImportService', () => {
	let importService: ImportService;
	let tagRepository: TagRepository;
	let owner: User;
	let ownerPersonalProject: Project;

	beforeAll(async () => {
		await testDb.init();

		owner = await createOwner();
		ownerPersonalProject = await getPersonalProject(owner);

		tagRepository = Container.get(TagRepository);

		const credentialsRepository = mockInstance(CredentialsRepository);

		credentialsRepository.find.mockResolvedValue([]);

		importService = new ImportService(mock(), credentialsRepository, tagRepository);
	});

	afterEach(async () => {
		await testDb.truncate(['Workflow', 'SharedWorkflow', 'Tag', 'WorkflowTagMapping']);
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
	});

	test('should make user owner of imported workflow', async () => {
		const workflowToImport = newWorkflow();

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);

		const dbSharing = await Container.get(SharedWorkflowRepository).findOneOrFail({
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
		const workflowToImport = await createWorkflow({ active: true });

		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);

		const dbWorkflow = await getWorkflowById(workflowToImport.id);

		if (!dbWorkflow) fail('Expected to find workflow');

		expect(dbWorkflow.active).toBe(false);
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

		const dbWorkflow = await Container.get(WorkflowRepository).findOneOrFail({
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

		const dbWorkflow = await Container.get(WorkflowRepository).findOneOrFail({
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

		const dbWorkflow = await Container.get(WorkflowRepository).findOneOrFail({
			where: { id: workflowToImport.id },
			relations: ['tags'],
		});

		if (!dbWorkflow.tags) fail('No tags found on workflow');

		expect(dbWorkflow.tags.at(0)?.name).toBe(tag.name); // workflow tagged

		const dbTag = await tagRepository.findOneOrFail({ where: { name: tag.name } });

		expect(dbTag.name).toBe(tag.name); // tag created
	});
});
