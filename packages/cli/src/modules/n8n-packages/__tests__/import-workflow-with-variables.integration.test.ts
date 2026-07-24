import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { VariablesRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { createMember, createOwner } from '@test-integration/db/users';
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

type ImportParams = { user: User; projectId?: string; packageBuffer: Buffer } & Partial<
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
		variableParentPolicy: 'project',
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
			expect(result.variables).toEqual({ matched: [], missing: ['API_URL'], stubbed: [] });
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

			expect(result.variables).toEqual({ matched: ['API_URL'], missing: [], stubbed: [] });
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

			expect(result.variables).toEqual({ matched: ['API_URL'], missing: [], stubbed: [] });
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

			expect(result.variables).toEqual({ matched: [], missing: ['API_URL'], stubbed: [] });
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
			expect(result.variables).toEqual({ matched: [], missing: [], stubbed: [] });
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
			expect(result.variables).toEqual({ matched: ['API_URL'], missing: [], stubbed: [] });
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
			expect(result.variables).toEqual({ matched: ['API_URL'], missing: [], stubbed: [] });
			expect(await variablesInProject(targetProject.id)).toEqual([]);
			expect(await variablesRepository.count()).toBe(variablesBefore);
		});
	});

	describe('create-stub missing mode', () => {
		beforeEach(() => {
			licenseMocker.reset();
			licenseMocker.enable('feat:variables');
		});

		/** Every variable row in the instance as `{ key, scope, value }`; scope is a project id or 'global'. */
		async function variableLayout() {
			const rows = await variablesRepository.find({ relations: { project: true } });
			return rows.map((v) => ({ key: v.key, scope: v.project?.id ?? 'global', value: v.value }));
		}

		it('creates the missing variable in the target project under project placement', async () => {
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
				variableMissingMode: 'create-stub',
				variableParentPolicy: 'project',
			});

			expect(result.workflows[0].status).toBe('created');
			expect(result.variables).toEqual({ matched: [], missing: [], stubbed: ['API_URL'] });
			// The stub (empty value) lands in the target project; the source row is untouched.
			const layout = await variableLayout();
			expect(layout).toEqual(
				expect.arrayContaining([
					{ key: 'API_URL', scope: sourceProject.id, value: 'https://source.example.com' },
					{ key: 'API_URL', scope: targetProject.id, value: '' },
				]),
			);
			expect(layout).toHaveLength(2);
		});

		it('creates the missing variable at global scope under global placement', async () => {
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
				variableMissingMode: 'create-stub',
				variableParentPolicy: 'global',
			});

			expect(result.variables).toEqual({ matched: [], missing: [], stubbed: ['API_URL'] });
			// The stub is created at the global scope — nothing lands in the target project.
			const layout = await variableLayout();
			expect(layout).toEqual(
				expect.arrayContaining([
					{ key: 'API_URL', scope: sourceProject.id, value: 'https://source.example.com' },
					{ key: 'API_URL', scope: 'global', value: '' },
				]),
			);
			expect(layout).toHaveLength(2);
		});

		it('creates the stub in the importer personal project when no projectId is given', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Source', owner);
			await createProjectVariable('API_URL', 'https://source.example.com', sourceProject);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});

			const packageBuffer = await exportWorkflowPackage(owner, workflow.id);

			const result = await importPackage({
				user: owner,
				packageBuffer,
				variableMissingMode: 'create-stub',
			});

			expect(result.variables).toEqual({ matched: [], missing: [], stubbed: ['API_URL'] });
			const personalProject = await getPersonalProject(owner);
			const layout = await variableLayout();
			expect(layout).toEqual(
				expect.arrayContaining([
					{ key: 'API_URL', scope: sourceProject.id, value: 'https://source.example.com' },
					{ key: 'API_URL', scope: personalProject.id, value: '' },
				]),
			);
			expect(layout).toHaveLength(2);
		});

		it('rejects global placement for a user without the global variable:create scope', async () => {
			const owner = await createOwner();
			const member = await createMember();
			const sourceProject = await createTeamProject('Source', owner);
			const targetProject = await createTeamProject('Target', owner);
			// An editor may import workflows and create project variables, but global placement
			// additionally requires the global variable:create scope, which members lack.
			await linkUserToProject(member, targetProject, 'project:editor');
			await createProjectVariable('API_URL', 'https://source.example.com', sourceProject);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});

			const packageBuffer = await exportWorkflowPackage(owner, workflow.id);
			const workflowsBefore = await workflowRepository.count();
			const variablesBefore = await variablesRepository.count();

			await expect(
				importPackage({
					user: member,
					projectId: targetProject.id,
					packageBuffer,
					variableMissingMode: 'create-stub',
					variableParentPolicy: 'global',
				}),
			).rejects.toThrow('You are not allowed to create global variables');

			expect(await workflowRepository.count()).toBe(workflowsBefore);
			expect(await variablesRepository.count()).toBe(variablesBefore);
		});

		it('rejects project placement for a user without projectVariable:create in the target', async () => {
			const owner = await createOwner();
			const member = await createMember();
			const sourceProject = await createTeamProject('Source', owner);
			await createProjectVariable('API_URL', 'https://source.example.com', sourceProject);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});

			const packageBuffer = await exportWorkflowPackage(owner, workflow.id);
			const workflowsBefore = await workflowRepository.count();
			const variablesBefore = await variablesRepository.count();

			// A member may import into their own personal project, but its personal-owner role does
			// not carry projectVariable:create, so the stub creation preflight rejects the import.
			await expect(
				importPackage({
					user: member,
					packageBuffer,
					variableMissingMode: 'create-stub',
					variableParentPolicy: 'project',
				}),
			).rejects.toThrow('You are not allowed to create variables in this project');

			expect(await workflowRepository.count()).toBe(workflowsBefore);
			expect(await variablesRepository.count()).toBe(variablesBefore);
		});

		it('rejects the import outright for a project viewer on the target project', async () => {
			const owner = await createOwner();
			const member = await createMember();
			const sourceProject = await createTeamProject('Source', owner);
			const targetProject = await createTeamProject('Target', owner);
			// Viewers cannot import at all (no workflow:import), so the rejection happens at
			// import-permission resolution, before any variable RBAC runs.
			await linkUserToProject(member, targetProject, 'project:viewer');
			await createProjectVariable('API_URL', 'https://source.example.com', sourceProject);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});

			const packageBuffer = await exportWorkflowPackage(owner, workflow.id);
			const workflowsBefore = await workflowRepository.count();
			const variablesBefore = await variablesRepository.count();

			await expect(
				importPackage({
					user: member,
					projectId: targetProject.id,
					packageBuffer,
					variableMissingMode: 'create-stub',
				}),
			).rejects.toThrow('You do not have permission to import into this project.');

			expect(await workflowRepository.count()).toBe(workflowsBefore);
			expect(await variablesRepository.count()).toBe(variablesBefore);
		});

		it('rejects a create-stub import when the API key lacks the variable:create scope', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Source', owner);
			const targetProject = await createTeamProject('Target', owner);
			await createProjectVariable('API_URL', 'https://source.example.com', sourceProject);
			// The variable already resolves in the target: the gate is requirement-based and
			// applies regardless, mirroring the dataTable:create gate.
			await createProjectVariable('API_URL', 'https://target.example.com', targetProject);
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
					apiKeyScopes: ['workflow:import'],
					variableMissingMode: 'create-stub',
				}),
			).rejects.toBeInstanceOf(ForbiddenError);

			expect(await workflowRepository.count()).toBe(workflowsBefore);
		});

		it('rejects the import when variables are not licensed', async () => {
			licenseMocker.disable('feat:variables');
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
					variableMissingMode: 'create-stub',
				}),
			).rejects.toThrow(/license does not allow variables/);

			expect(await workflowRepository.count()).toBe(workflowsBefore);
			expect(await variablesInProject(targetProject.id)).toEqual([]);
		});

		it('does not create a stub when the variable already resolves in the target project', async () => {
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

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				variableMissingMode: 'create-stub',
				variableParentPolicy: 'project',
			});

			expect(result.variables).toEqual({ matched: ['API_URL'], missing: [], stubbed: [] });
			// No new rows, and the target's existing value is not overwritten by an empty stub.
			const layout = await variableLayout();
			expect(layout).toEqual(
				expect.arrayContaining([
					{ key: 'API_URL', scope: sourceProject.id, value: 'https://source.example.com' },
					{ key: 'API_URL', scope: targetProject.id, value: 'https://target.example.com' },
				]),
			);
			expect(layout).toHaveLength(2);
		});

		it('blocks the import and writes nothing when creating the stub would exceed the quota', async () => {
			licenseMocker.setQuota('quota:maxVariables', 0);
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
					variableMissingMode: 'create-stub',
					variableParentPolicy: 'project',
				}),
			).rejects.toMatchObject({
				message: /Import blocked/,
				meta: {
					issues: [expect.objectContaining({ type: 'variable-limit-exceeded' })],
				},
			});

			expect(await workflowRepository.count()).toBe(workflowsBefore);
			expect(await variablesInProject(targetProject.id)).toEqual([]);
		});
	});
});
