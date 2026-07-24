import { LicenseState } from '@n8n/backend-common';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { VariablesRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { createOwner } from '@test-integration/db/users';
import { createProjectVariable, createVariable } from '@test-integration/db/variables';
import { LicenseMocker } from '@test-integration/license';
import { initNodeTypes } from '@test-integration/utils';

import { N8nPackagesService } from '../n8n-packages.service';
import type { ImportPackageRequest } from '../n8n-packages.types';
import { streamToBuffer } from './utils/tar-support';
import { buildWorkflowReferencingVariables } from './utils/test-builders';

let service: N8nPackagesService;
let variablesRepository: VariablesRepository;
let workflowRepository: WorkflowRepository;
let variablesService: VariablesService;

const licenseMocker = new LicenseMocker();

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
	await initNodeTypes();
	licenseMocker.mockLicenseState(Container.get(LicenseState));
	service = Container.get(N8nPackagesService);
	variablesRepository = Container.get(VariablesRepository);
	workflowRepository = Container.get(WorkflowRepository);
	variablesService = Container.get(VariablesService);
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'Variables',
		'ProjectRelation',
		'Project',
	]);
	await variablesService.updateCache();
});

type ImportParams = { user: User; projectId: string; packageBuffer: Buffer } & Partial<
	Omit<ImportPackageRequest, 'user' | 'projectId' | 'packageBuffer'>
>;

async function importPackage(params: ImportParams) {
	return await service.importPackage({
		credentialMatchingMode: 'id-only',
		credentialMissingMode: 'must-preexist',
		workflowConflictPolicy: 'fail',
		workflowPublishingPolicy: 'preserve-published-state',
		workflowIdPolicy: 'new',
		folderConflictPolicy: 'merge',
		dataTableMatchingMode: 'by-id',
		dataTableMissingMode: 'create',
		dataTableSchemaConflictPolicy: 'keep-existing',
		variableMissingMode: 'do-nothing',
		missingNodeTypeMode: 'fail',
		...params,
	});
}

async function exportWorkflowPackage(user: User, workflowId: string): Promise<Buffer> {
	const stream = await service.exportPackage({
		user,
		workflowIds: [workflowId],
		includeVariableValues: true,
	});
	return await streamToBuffer(stream);
}

async function variablesInProject(projectId: string) {
	return await variablesRepository.find({
		where: { project: { id: projectId } },
		relations: { project: true },
	});
}

describe('workflow package import — with variables', () => {
	describe('do-nothing missing mode', () => {
		it('imports the workflow, reports the missing name as a warning, and creates no variable', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Source', owner);
			const targetProject = await createTeamProject('Target', owner);
			await createProjectVariable('API_URL', 'https://source.example.com', sourceProject);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});

			const packageBuffer = await exportWorkflowPackage(owner, workflow.id);
			const variablesBefore = await variablesRepository.count();

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				variableMissingMode: 'do-nothing',
			});

			expect(result.workflows).toHaveLength(1);
			expect(result.workflows[0].status).toBe('created');
			expect(result.variables).toEqual({ matched: [], missing: ['API_URL'] });
			expect(await variablesRepository.count()).toBe(variablesBefore);
			expect(await variablesInProject(targetProject.id)).toEqual([]);
			expect(await workflowRepository.count()).toBe(2);
		});

		it('matches a variable that already exists in the target project', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Source', owner);
			const targetProject = await createTeamProject('Target', owner);
			await createProjectVariable('API_URL', 'https://source.example.com', sourceProject);
			await createProjectVariable('API_URL', 'https://target.example.com', targetProject);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});

			const packageBuffer = await exportWorkflowPackage(owner, workflow.id);
			const variablesBefore = await variablesRepository.count();

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
			});

			expect(result.variables).toEqual({ matched: ['API_URL'], missing: [] });
			expect(await variablesRepository.count()).toBe(variablesBefore);
			const targetVars = await variablesInProject(targetProject.id);
			expect(targetVars).toHaveLength(1);
			expect(targetVars[0].value).toBe('https://target.example.com');
		});

		it('matches via a global variable when none exists in the target project', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Source', owner);
			const targetProject = await createTeamProject('Target', owner);
			await createVariable('API_URL', 'https://global.example.com');
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});

			const packageBuffer = await exportWorkflowPackage(owner, workflow.id);
			const variablesBefore = await variablesRepository.count();

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
			});

			expect(result.variables).toEqual({ matched: ['API_URL'], missing: [] });
			expect(await variablesInProject(targetProject.id)).toEqual([]);
			expect(await variablesRepository.count()).toBe(variablesBefore);
		});

		it('defaults to do-nothing when the caller does not override the mode', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Source', owner);
			const targetProject = await createTeamProject('Target', owner);
			await createProjectVariable('API_URL', 'https://source.example.com', sourceProject);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});

			const packageBuffer = await exportWorkflowPackage(owner, workflow.id);

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
			});

			expect(result.variables).toEqual({ matched: [], missing: ['API_URL'] });
			expect(await variablesInProject(targetProject.id)).toEqual([]);
		});
	});

	describe('must-preexist missing mode', () => {
		it('imports a package with no variable requirements', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Source', owner);
			const targetProject = await createTeamProject('Target', owner);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow without vars',
				project: sourceProject,
				variableNames: [],
			});

			const packageBuffer = await exportWorkflowPackage(owner, workflow.id);

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				variableMissingMode: 'must-preexist',
			});

			expect(result.workflows).toHaveLength(1);
			expect(result.workflows[0].status).toBe('created');
			expect(result.variables).toEqual({ matched: [], missing: [] });
		});

		it('blocks the import and writes nothing when a referenced variable is unresolved', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Source', owner);
			const targetProject = await createTeamProject('Target', owner);
			await createProjectVariable('API_URL', 'https://source.example.com', sourceProject);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});

			const packageBuffer = await exportWorkflowPackage(owner, workflow.id);
			const workflowsBefore = await workflowRepository.count();

			await expect(
				importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					variableMissingMode: 'must-preexist',
				}),
			).rejects.toMatchObject({
				message: /Import blocked/,
				meta: {
					issues: [expect.objectContaining({ type: 'variable-unresolved', name: 'API_URL' })],
				},
			});

			expect(await workflowRepository.count()).toBe(workflowsBefore);
			expect(await variablesInProject(targetProject.id)).toEqual([]);
		});

		it('imports when every referenced variable already resolves in the target project', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Source', owner);
			const targetProject = await createTeamProject('Target', owner);
			await createProjectVariable('API_URL', 'https://source.example.com', sourceProject);
			await createProjectVariable('API_URL', 'https://target.example.com', targetProject);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});

			const packageBuffer = await exportWorkflowPackage(owner, workflow.id);
			const variablesBefore = await variablesRepository.count();

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				variableMissingMode: 'must-preexist',
			});

			expect(result.workflows).toHaveLength(1);
			expect(result.workflows[0].status).toBe('created');
			expect(result.variables).toEqual({ matched: ['API_URL'], missing: [] });
			expect(await variablesRepository.count()).toBe(variablesBefore);
		});

		it('imports when a referenced variable resolves only at the global level', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Source', owner);
			const targetProject = await createTeamProject('Target', owner);
			await createVariable('API_URL', 'https://global.example.com');
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});

			const packageBuffer = await exportWorkflowPackage(owner, workflow.id);
			const variablesBefore = await variablesRepository.count();

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				variableMissingMode: 'must-preexist',
			});

			expect(result.workflows).toHaveLength(1);
			expect(result.workflows[0].status).toBe('created');
			expect(result.variables).toEqual({ matched: ['API_URL'], missing: [] });
			expect(await variablesInProject(targetProject.id)).toEqual([]);
			expect(await variablesRepository.count()).toBe(variablesBefore);
		});
	});
});
