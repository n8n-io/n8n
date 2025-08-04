'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const uuid_1 = require('uuid');
const import_service_1 = require('@/services/import.service');
const users_1 = require('./shared/db/users');
describe('ImportService', () => {
	let importService;
	let tagRepository;
	let owner;
	let ownerPersonalProject;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
		owner = await (0, users_1.createOwner)();
		ownerPersonalProject = await (0, backend_test_utils_1.getPersonalProject)(owner);
		tagRepository = di_1.Container.get(db_1.TagRepository);
		const credentialsRepository = di_1.Container.get(db_1.CredentialsRepository);
		importService = new import_service_1.ImportService(
			(0, jest_mock_extended_1.mock)(),
			credentialsRepository,
			tagRepository,
		);
	});
	afterEach(async () => {
		await backend_test_utils_1.testDb.truncate([
			'WorkflowEntity',
			'SharedWorkflow',
			'TagEntity',
			'WorkflowTagMapping',
		]);
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	test('should import credless and tagless workflow', async () => {
		const workflowToImport = await (0, backend_test_utils_1.createWorkflow)();
		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);
		const dbWorkflow = await (0, backend_test_utils_1.getWorkflowById)(workflowToImport.id);
		if (!dbWorkflow) fail('Expected to find workflow');
		expect(dbWorkflow.id).toBe(workflowToImport.id);
	});
	test('should make user owner of imported workflow', async () => {
		const workflowToImport = (0, backend_test_utils_1.newWorkflow)();
		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);
		const dbSharing = await di_1.Container.get(db_1.SharedWorkflowRepository).findOneOrFail({
			where: {
				workflowId: workflowToImport.id,
				projectId: ownerPersonalProject.id,
				role: 'workflow:owner',
			},
		});
		expect(dbSharing.projectId).toBe(ownerPersonalProject.id);
	});
	test('should not change the owner if it already exists', async () => {
		const member = await (0, users_1.createMember)();
		const memberPersonalProject = await (0, backend_test_utils_1.getPersonalProject)(member);
		const workflowToImport = await (0, backend_test_utils_1.createWorkflow)(undefined, owner);
		await importService.importWorkflows([workflowToImport], memberPersonalProject.id);
		const sharings = await (0, backend_test_utils_1.getAllSharedWorkflows)();
		expect(sharings).toMatchObject([
			expect.objectContaining({
				workflowId: workflowToImport.id,
				projectId: ownerPersonalProject.id,
				role: 'workflow:owner',
			}),
		]);
	});
	test('should deactivate imported workflow if active', async () => {
		const workflowToImport = await (0, backend_test_utils_1.createWorkflow)({ active: true });
		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);
		const dbWorkflow = await (0, backend_test_utils_1.getWorkflowById)(workflowToImport.id);
		if (!dbWorkflow) fail('Expected to find workflow');
		expect(dbWorkflow.active).toBe(false);
	});
	test('should leave intact new-format credentials', async () => {
		const credential = {
			n8nApi: { id: '123', name: 'n8n API' },
		};
		const nodes = [
			{
				id: (0, uuid_1.v4)(),
				name: 'n8n',
				parameters: {},
				position: [0, 0],
				type: 'n8n-nodes-base.n8n',
				typeVersion: 1,
				credentials: credential,
			},
		];
		const workflowToImport = await (0, backend_test_utils_1.createWorkflow)({ nodes });
		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);
		const dbWorkflow = await (0, backend_test_utils_1.getWorkflowById)(workflowToImport.id);
		if (!dbWorkflow) fail('Expected to find workflow');
		expect(dbWorkflow.nodes.at(0)?.credentials).toMatchObject(credential);
	});
	test('should set tag by identical match', async () => {
		const tag = Object.assign(new db_1.TagEntity(), {
			id: '123',
			createdAt: new Date(),
			name: 'Test',
		});
		await tagRepository.save(tag);
		const workflowToImport = await (0, backend_test_utils_1.createWorkflow)({ tags: [tag] });
		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);
		const dbWorkflow = await di_1.Container.get(db_1.WorkflowRepository).findOneOrFail({
			where: { id: workflowToImport.id },
			relations: ['tags'],
		});
		expect(dbWorkflow.tags).toStrictEqual([tag]);
		const dbTags = await tagRepository.find();
		expect(dbTags).toStrictEqual([tag]);
	});
	test('should set tag by name match', async () => {
		const tag = Object.assign(new db_1.TagEntity(), { name: 'Test' });
		await tagRepository.save(tag);
		const workflowToImport = await (0, backend_test_utils_1.createWorkflow)({ tags: [tag] });
		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);
		const dbWorkflow = await di_1.Container.get(db_1.WorkflowRepository).findOneOrFail({
			where: { id: workflowToImport.id },
			relations: ['tags'],
		});
		expect(dbWorkflow.tags).toStrictEqual([tag]);
		const dbTags = await tagRepository.find();
		expect(dbTags).toStrictEqual([tag]);
	});
	test('should set tag by creating if no match', async () => {
		const tag = Object.assign(new db_1.TagEntity(), { name: 'Test' });
		const workflowToImport = await (0, backend_test_utils_1.createWorkflow)({ tags: [tag] });
		await importService.importWorkflows([workflowToImport], ownerPersonalProject.id);
		const dbWorkflow = await di_1.Container.get(db_1.WorkflowRepository).findOneOrFail({
			where: { id: workflowToImport.id },
			relations: ['tags'],
		});
		if (!dbWorkflow.tags) fail('No tags found on workflow');
		expect(dbWorkflow.tags.at(0)?.name).toBe(tag.name);
		const dbTag = await tagRepository.findOneOrFail({ where: { name: tag.name } });
		expect(dbTag.name).toBe(tag.name);
	});
});
//# sourceMappingURL=import.service.test.js.map
