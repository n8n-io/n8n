import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { VariablesRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import type { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { VariableCountLimitReachedError } from '@/errors/variable-count-limit-reached.error';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { createMember, createOwner } from '@test-integration/db/users';
import { createProjectVariable, createVariable } from '@test-integration/db/variables';
import { LicenseMocker } from '@test-integration/license';
import { initNodeTypes } from '@test-integration/utils';

import { N8nPackagesService } from '../n8n-packages.service';
import { importPackageRequest } from './fixtures/import-request';
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
	return await service.importPackage(
		importPackageRequest({ variableParentPolicy: 'project', ...params }),
	);
}

async function exportWorkflowPackage(
	user: User,
	workflowId: string,
	includeVariableValues = true,
): Promise<Buffer> {
	const { stream } = await service.exportPackage({
		user,
		workflowIds: [workflowId],
		includeVariableValues,
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
			expect(result.variables).toEqual({
				matched: [],
				missing: ['API_URL'],
				created: [],
				stubbed: [],
				updated: [],
			});
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

			expect(result.variables).toEqual({
				matched: ['API_URL'],
				missing: [],
				created: [],
				stubbed: [],
				updated: [],
			});
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

			expect(result.variables).toEqual({
				matched: ['API_URL'],
				missing: [],
				created: [],
				stubbed: [],
				updated: [],
			});
			expect(await variablesInProject(targetProject.id)).toEqual([]);
			expect(await variablesRepository.count()).toBe(variablesBefore);
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
			expect(result.variables).toEqual({
				matched: [],
				missing: [],
				created: [],
				stubbed: [],
				updated: [],
			});
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
			expect(result.variables).toEqual({
				matched: ['API_URL'],
				missing: [],
				created: [],
				stubbed: [],
				updated: [],
			});
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
			expect(result.variables).toEqual({
				matched: ['API_URL'],
				missing: [],
				created: [],
				stubbed: [],
				updated: [],
			});
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
			expect(result.variables).toEqual({
				matched: [],
				missing: [],
				created: [],
				stubbed: ['API_URL'],
				updated: [],
			});
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

			expect(result.variables).toEqual({
				matched: [],
				missing: [],
				created: [],
				stubbed: ['API_URL'],
				updated: [],
			});
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

			expect(result.variables).toEqual({
				matched: [],
				missing: [],
				created: [],
				stubbed: ['API_URL'],
				updated: [],
			});
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

		it('carries the package value into the personal project when no projectId is given', async () => {
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
				variableMissingMode: 'create-with-value',
			});

			expect(result.variables).toEqual({
				matched: [],
				missing: [],
				created: ['API_URL'],
				stubbed: [],
				updated: [],
			});
			const personalProject = await getPersonalProject(owner);
			const layout = await variableLayout();
			expect(layout).toEqual(
				expect.arrayContaining([
					{ key: 'API_URL', scope: sourceProject.id, value: 'https://source.example.com' },
					{ key: 'API_URL', scope: personalProject.id, value: 'https://source.example.com' },
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

		it('creates the stub for an API key carrying variable:create', async () => {
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
				apiKeyScopes: ['workflow:import', 'variable:create'],
				variableMissingMode: 'create-stub',
			});

			expect(result.variables).toEqual({
				matched: [],
				missing: [],
				created: [],
				stubbed: ['API_URL'],
				updated: [],
			});
			expect(await variablesInProject(targetProject.id)).toHaveLength(1);
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

			expect(result.variables).toEqual({
				matched: ['API_URL'],
				missing: [],
				created: [],
				stubbed: [],
				updated: [],
			});
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
					issues: [
						{
							type: 'variable-limit-exceeded',
							limit: 0,
							remaining: 0,
							requested: 1,
							names: ['API_URL'],
							usedByWorkflows: [workflow.id],
						},
					],
				},
			});

			expect(await workflowRepository.count()).toBe(workflowsBefore);
			expect(await variablesInProject(targetProject.id)).toEqual([]);
		});

		it('fails the import, leaving the workflow, when the stub fails a quota the preflight had cleared', async () => {
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
			// The workflow survives the failure: an accepted trade for applying variables after it.
			vi.spyOn(variablesService, 'create').mockRejectedValueOnce(
				new VariableCountLimitReachedError('Variables limit reached'),
			);

			await expect(
				importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					variableMissingMode: 'create-stub',
				}),
			).rejects.toThrow('Variables limit reached');

			expect(await workflowRepository.count()).toBe(workflowsBefore + 1);
			expect(await variablesInProject(targetProject.id)).toEqual([]);
		});
	});

	describe('variables licence gate', () => {
		beforeEach(() => {
			licenseMocker.reset();
			licenseMocker.enable('feat:variables');
		});

		/** A workflow referencing API_URL, packaged, with the name resolvable in the target. */
		async function resolvablePackage(owner: User, targetProject: Project) {
			const sourceProject = await createTeamProject('Source', owner);
			await createProjectVariable('API_URL', 'https://source.example.com', sourceProject);
			await createProjectVariable('API_URL', 'https://target.example.com', targetProject);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});
			return await exportWorkflowPackage(owner, workflow.id);
		}

		async function unresolvablePackage(owner: User) {
			const sourceProject = await createTeamProject('Source', owner);
			await createProjectVariable('API_URL', 'https://source.example.com', sourceProject);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});
			return await exportWorkflowPackage(owner, workflow.id);
		}

		it('rejects a create-stub import when variables are not licensed', async () => {
			const owner = await createOwner();
			const targetProject = await createTeamProject('Target', owner);
			const packageBuffer = await unresolvablePackage(owner);
			const workflowsBefore = await workflowRepository.count();
			licenseMocker.disable('feat:variables');

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

		it.each(['do-nothing', 'must-preexist', 'create-stub', 'create-with-value'] as const)(
			'imports under %s without a variables licence when nothing needs creating',
			async (variableMissingMode) => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const packageBuffer = await resolvablePackage(owner, targetProject);
				licenseMocker.disable('feat:variables');

				const result = await importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					variableMissingMode,
				});

				expect(result.workflows[0].status).toBe('created');
				expect(result.variables).toEqual({
					matched: ['API_URL'],
					missing: [],
					created: [],
					stubbed: [],
					updated: [],
				});
			},
		);

		it('imports a variable-free package under create-stub without a variables licence', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Source', owner);
			const targetProject = await createTeamProject('Target', owner);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow without vars',
				project: sourceProject,
				variableNames: [],
			});

			const packageBuffer = await exportWorkflowPackage(owner, workflow.id);
			licenseMocker.disable('feat:variables');

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer,
				variableMissingMode: 'create-stub',
			});

			expect(result.workflows[0].status).toBe('created');
			expect(result.variables).toEqual({
				matched: [],
				missing: [],
				created: [],
				stubbed: [],
				updated: [],
			});
		});

		it('names the licence, not the API key scope, when an unlicensed key also lacks variable:create', async () => {
			const owner = await createOwner();
			const targetProject = await createTeamProject('Target', owner);
			const packageBuffer = await unresolvablePackage(owner);
			licenseMocker.disable('feat:variables');

			await expect(
				importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					apiKeyScopes: ['workflow:import'],
					variableMissingMode: 'create-stub',
				}),
			).rejects.toThrow(/license does not allow variables/);
		});
	});

	describe('create-with-value missing mode', () => {
		beforeEach(() => {
			licenseMocker.reset();
			licenseMocker.enable('feat:variables');
		});

		async function variableLayout() {
			const rows = await variablesRepository.find({ relations: { project: true } });
			return rows.map((v) => ({ key: v.key, scope: v.project?.id ?? 'global', value: v.value }));
		}

		it('creates the missing variable with its package value in the target project', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Source', owner);
			const targetProject = await createTeamProject('Target', owner);
			await createProjectVariable('API_URL', 'https://source.example.com', sourceProject);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer: await exportWorkflowPackage(owner, workflow.id),
				variableMissingMode: 'create-with-value',
				variableParentPolicy: 'project',
			});

			expect(result.variables).toEqual({
				matched: [],
				missing: [],
				created: ['API_URL'],
				stubbed: [],
				updated: [],
			});
			expect(await variableLayout()).toEqual(
				expect.arrayContaining([
					{ key: 'API_URL', scope: sourceProject.id, value: 'https://source.example.com' },
					{ key: 'API_URL', scope: targetProject.id, value: 'https://source.example.com' },
				]),
			);
		});

		it('creates the missing variable with its package value at global scope', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Source', owner);
			const targetProject = await createTeamProject('Target', owner);
			await createProjectVariable('API_URL', 'https://source.example.com', sourceProject);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer: await exportWorkflowPackage(owner, workflow.id),
				variableMissingMode: 'create-with-value',
				variableParentPolicy: 'global',
			});

			expect(result.variables.created).toEqual(['API_URL']);
			expect(await variableLayout()).toEqual(
				expect.arrayContaining([
					{ key: 'API_URL', scope: 'global', value: 'https://source.example.com' },
				]),
			);
		});

		it('falls back to an empty stub when the package excludes variable values', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Source', owner);
			const targetProject = await createTeamProject('Target', owner);
			await createProjectVariable('API_URL', 'https://source.example.com', sourceProject);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer: await exportWorkflowPackage(owner, workflow.id, false),
				variableMissingMode: 'create-with-value',
			});

			expect(result.variables).toEqual({
				matched: [],
				missing: [],
				created: [],
				stubbed: ['API_URL'],
				updated: [],
			});
			expect(await variableLayout()).toEqual(
				expect.arrayContaining([{ key: 'API_URL', scope: targetProject.id, value: '' }]),
			);
		});

		it('does not overwrite a variable that already resolves in the target project', async () => {
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

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer: await exportWorkflowPackage(owner, workflow.id),
				variableMissingMode: 'create-with-value',
			});

			expect(result.variables).toEqual({
				matched: ['API_URL'],
				missing: [],
				created: [],
				stubbed: [],
				updated: [],
			});
			expect((await variablesInProject(targetProject.id))[0].value).toBe(
				'https://target.example.com',
			);
		});

		it('rejects the import when the API key lacks variable:create and a variable must be created', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Source', owner);
			const targetProject = await createTeamProject('Target', owner);
			await createProjectVariable('API_URL', 'source', sourceProject);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});

			await expect(
				importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer: await exportWorkflowPackage(owner, workflow.id),
					apiKeyScopes: ['workflow:import'],
					variableMissingMode: 'create-with-value',
				}),
			).rejects.toBeInstanceOf(ForbiddenError);
		});

		it('does not require variable:create when every variable already resolves', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Source', owner);
			const targetProject = await createTeamProject('Target', owner);
			await createProjectVariable('API_URL', 'source', sourceProject);
			await createProjectVariable('API_URL', 'target', targetProject);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});

			const result = await importPackage({
				user: owner,
				projectId: targetProject.id,
				packageBuffer: await exportWorkflowPackage(owner, workflow.id),
				apiKeyScopes: ['workflow:import'],
				variableMissingMode: 'create-with-value',
			});

			expect(result.variables).toMatchObject({ matched: ['API_URL'], created: [] });
		});

		it('allows do-nothing without variable:create as the non-creating escape hatch', async () => {
			const owner = await createOwner();
			const sourceProject = await createTeamProject('Source', owner);
			const targetProject = await createTeamProject('Target', owner);
			await createProjectVariable('API_URL', 'source', sourceProject);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});

			await expect(
				importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer: await exportWorkflowPackage(owner, workflow.id),
					apiKeyScopes: ['workflow:import'],
					variableMissingMode: 'do-nothing',
				}),
			).resolves.toMatchObject({ variables: { missing: ['API_URL'] } });
		});
	});

	describe('conflict policy', () => {
		beforeEach(() => {
			licenseMocker.reset();
			licenseMocker.enable('feat:variables');
		});

		async function variableLayout() {
			const rows = await variablesRepository.find({ relations: { project: true } });
			return rows.map((v) => ({ key: v.key, scope: v.project?.id ?? 'global', value: v.value }));
		}

		/**
		 * A workflow referencing API_URL, exported from a source project holding `sourceValue`.
		 * Omitting values produces a package with nothing to compare against the target.
		 */
		async function packageReferencing(
			owner: User,
			sourceValue: string,
			{ includeVariableValues = true } = {},
		) {
			const sourceProject = await createTeamProject('Source', owner);
			await createProjectVariable('API_URL', sourceValue, sourceProject);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project: sourceProject,
				variableNames: ['API_URL'],
			});
			return {
				sourceProject,
				workflow,
				packageBuffer: await exportWorkflowPackage(owner, workflow.id, includeVariableValues),
			};
		}

		describe('keep-existing', () => {
			it('leaves a differing project-scoped value untouched and reports it as matched', async () => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { sourceProject, packageBuffer } = await packageReferencing(owner, 'from-source');
				await createProjectVariable('API_URL', 'from-target', targetProject);

				const result = await importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					variableConflictPolicy: 'keep-existing',
				});

				expect(result.workflows[0].status).toBe('created');
				expect(result.variables).toEqual({
					matched: ['API_URL'],
					missing: [],
					created: [],
					stubbed: [],
					updated: [],
				});
				expect(await variableLayout()).toEqual(
					expect.arrayContaining([
						{ key: 'API_URL', scope: sourceProject.id, value: 'from-source' },
						{ key: 'API_URL', scope: targetProject.id, value: 'from-target' },
					]),
				);
			});

			it('leaves a differing global value untouched', async () => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { packageBuffer } = await packageReferencing(owner, 'from-source');
				await createVariable('API_URL', 'from-global');

				const result = await importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					variableConflictPolicy: 'keep-existing',
				});

				expect(result.variables).toMatchObject({ matched: ['API_URL'], updated: [] });
				expect(await variableLayout()).toEqual(
					expect.arrayContaining([{ key: 'API_URL', scope: 'global', value: 'from-global' }]),
				);
				expect(await variablesInProject(targetProject.id)).toEqual([]);
			});
		});

		describe('overwrite', () => {
			it('replaces a differing project-scoped value and reports it as updated', async () => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { sourceProject, packageBuffer } = await packageReferencing(owner, 'from-source');
				await createProjectVariable('API_URL', 'from-target', targetProject);

				const result = await importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					variableConflictPolicy: 'overwrite',
				});

				expect(result.workflows[0].status).toBe('created');
				expect(result.variables).toEqual({
					matched: [],
					missing: [],
					created: [],
					stubbed: [],
					updated: ['API_URL'],
				});
				const layout = await variableLayout();
				expect(layout).toEqual(
					expect.arrayContaining([
						{ key: 'API_URL', scope: sourceProject.id, value: 'from-source' },
						{ key: 'API_URL', scope: targetProject.id, value: 'from-source' },
					]),
				);
				expect(layout).toHaveLength(2);
			});

			it('replaces a differing global value at the global scope', async () => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { packageBuffer } = await packageReferencing(owner, 'from-source');
				await createVariable('API_URL', 'from-global');

				const result = await importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					variableConflictPolicy: 'overwrite',
				});

				expect(result.variables).toMatchObject({ matched: [], updated: ['API_URL'] });
				expect(await variableLayout()).toEqual(
					expect.arrayContaining([{ key: 'API_URL', scope: 'global', value: 'from-source' }]),
				);
				expect(await variablesInProject(targetProject.id)).toEqual([]);
			});

			it('leaves the value alone when the package carries no variable values', async () => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { packageBuffer } = await packageReferencing(owner, 'from-source', {
					includeVariableValues: false,
				});
				await createProjectVariable('API_URL', 'from-target', targetProject);

				const result = await importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					variableConflictPolicy: 'overwrite',
				});

				expect(result.variables).toMatchObject({ matched: ['API_URL'], updated: [] });
				expect((await variablesInProject(targetProject.id))[0].value).toBe('from-target');
			});

			it('leaves the value alone when the package bundles an empty value', async () => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { packageBuffer } = await packageReferencing(owner, '');
				await createProjectVariable('API_URL', 'from-target', targetProject);

				const result = await importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					variableConflictPolicy: 'overwrite',
				});

				expect(result.variables).toMatchObject({ matched: ['API_URL'], updated: [] });
				expect((await variablesInProject(targetProject.id))[0].value).toBe('from-target');
			});

			it('reports an identical value as matched rather than updated', async () => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { packageBuffer } = await packageReferencing(owner, 'same-everywhere');
				await createProjectVariable('API_URL', 'same-everywhere', targetProject);

				const result = await importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					variableConflictPolicy: 'overwrite',
				});

				expect(result.variables).toMatchObject({ matched: ['API_URL'], updated: [] });
			});

			it('leaves the overwrite unapplied when the workflow write fails', async () => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { packageBuffer } = await packageReferencing(owner, 'from-source');
				await createProjectVariable('API_URL', 'from-target', targetProject);
				const workflowsBefore = await workflowRepository.count();
				vi.spyOn(Container.get(WorkflowCreationService), 'createWorkflow').mockRejectedValueOnce(
					new Error('workflow write failed'),
				);

				await expect(
					importPackage({
						user: owner,
						projectId: targetProject.id,
						packageBuffer,
						variableConflictPolicy: 'overwrite',
					}),
				).rejects.toThrow('workflow write failed');

				expect(await workflowRepository.count()).toBe(workflowsBefore);
				expect((await variablesInProject(targetProject.id))[0].value).toBe('from-target');
			});

			it('skips an overwrite whose variable another writer deleted after the plan', async () => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { packageBuffer } = await packageReferencing(owner, 'from-source');
				const target = await createProjectVariable('API_URL', 'from-target', targetProject);
				// Deletes the row once the plan has read it, which is the window the write reopens.
				vi.spyOn(variablesService, 'getAllCached').mockImplementationOnce(async () => {
					const planned = await variablesRepository.find({ relations: { project: true } });
					await variablesRepository.delete(target.id);
					await variablesService.updateCache();
					return planned;
				});

				const result = await importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					variableConflictPolicy: 'overwrite',
				});

				// Nothing left to overwrite, so the import finishes rather than failing on a missing row.
				expect(result.workflows[0].status).toBe('created');
				expect(result.variables).toMatchObject({ matched: ['API_URL'], updated: [] });
				expect(await variablesInProject(targetProject.id)).toEqual([]);
			});
		});

		describe('fail', () => {
			it('blocks the import and writes nothing when a value differs', async () => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { workflow, packageBuffer } = await packageReferencing(owner, 'from-source');
				await createProjectVariable('API_URL', 'from-target', targetProject);
				const workflowsBefore = await workflowRepository.count();

				await expect(
					importPackage({
						user: owner,
						projectId: targetProject.id,
						packageBuffer,
						variableConflictPolicy: 'fail',
					}),
				).rejects.toMatchObject({
					message: /Import blocked/,
					meta: {
						issues: [
							{
								type: 'variable-conflict',
								name: 'API_URL',
								projectId: targetProject.id,
								usedByWorkflows: [workflow.id],
							},
						],
					},
				});

				expect(await workflowRepository.count()).toBe(workflowsBefore);
				expect((await variablesInProject(targetProject.id))[0].value).toBe('from-target');
			});

			it('names the global scope of the conflicting variable by omitting the project id', async () => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { workflow, packageBuffer } = await packageReferencing(owner, 'from-source');
				await createVariable('API_URL', 'from-global');

				const error = await importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					variableConflictPolicy: 'fail',
				}).catch((e: unknown) => e);

				expect((error as ConflictError).meta?.issues).toEqual([
					{ type: 'variable-conflict', name: 'API_URL', usedByWorkflows: [workflow.id] },
				]);
			});

			it('imports when the resolved value matches the package value', async () => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { packageBuffer } = await packageReferencing(owner, 'same-everywhere');
				await createProjectVariable('API_URL', 'same-everywhere', targetProject);

				const result = await importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					variableConflictPolicy: 'fail',
				});

				expect(result.workflows[0].status).toBe('created');
				expect(result.variables).toMatchObject({ matched: ['API_URL'], updated: [] });
			});

			it('imports when the package bundles an empty value', async () => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { packageBuffer } = await packageReferencing(owner, '');
				await createProjectVariable('API_URL', 'from-target', targetProject);

				const result = await importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					variableConflictPolicy: 'fail',
				});

				expect(result.workflows[0].status).toBe('created');
				expect(result.variables).toMatchObject({ matched: ['API_URL'], updated: [] });
				expect((await variablesInProject(targetProject.id))[0].value).toBe('from-target');
			});
		});

		/**
		 * A target row holding an empty value still holds a value, unlike an empty *package* value,
		 * which is nothing to write. So `overwrite` fills such a row and `fail` rejects it.
		 */
		describe('empty target value', () => {
			async function importAgainst(variableConflictPolicy: 'keep-existing' | 'overwrite' | 'fail') {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { workflow, packageBuffer } = await packageReferencing(owner, 'from-source');
				await createProjectVariable('API_URL', '', targetProject);

				return {
					targetProject,
					workflow,
					result: await importPackage({
						user: owner,
						projectId: targetProject.id,
						packageBuffer,
						variableConflictPolicy,
					}).catch((error: unknown) => error),
				};
			}

			it('leaves the empty value in place under keep-existing', async () => {
				const { targetProject, result } = await importAgainst('keep-existing');

				expect(result).toMatchObject({ variables: { matched: ['API_URL'], updated: [] } });
				expect((await variablesInProject(targetProject.id))[0].value).toBe('');
			});

			it('fills the empty value under overwrite', async () => {
				const { targetProject, result } = await importAgainst('overwrite');

				expect(result).toMatchObject({ variables: { matched: [], updated: ['API_URL'] } });
				expect((await variablesInProject(targetProject.id))[0].value).toBe('from-source');
			});

			it('blocks the import under fail', async () => {
				const { targetProject, workflow, result } = await importAgainst('fail');

				expect((result as ConflictError).meta?.issues).toEqual([
					{
						type: 'variable-conflict',
						name: 'API_URL',
						projectId: targetProject.id,
						usedByWorkflows: [workflow.id],
					},
				]);
				expect((await variablesInProject(targetProject.id))[0].value).toBe('');
			});
		});

		it.each(['keep-existing', 'overwrite', 'fail'] as const)(
			'defers to the missing mode under %s when the variable does not resolve',
			async (variableConflictPolicy) => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { packageBuffer } = await packageReferencing(owner, 'from-source');

				const result = await importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					variableMissingMode: 'create-with-value',
					variableConflictPolicy,
				});

				expect(result.variables).toMatchObject({ created: ['API_URL'], updated: [] });
				expect((await variablesInProject(targetProject.id))[0].value).toBe('from-source');
			},
		);

		describe('gating', () => {
			it('rejects an overwrite of a global variable without the global variable:update scope', async () => {
				const owner = await createOwner();
				const member = await createMember();
				const targetProject = await createTeamProject('Target', owner);
				// An editor may import and update project variables, but rewriting a global row
				// additionally requires the global variable:update scope, which members lack.
				await linkUserToProject(member, targetProject, 'project:editor');
				const { packageBuffer } = await packageReferencing(owner, 'from-source');
				await createVariable('API_URL', 'from-global');
				const workflowsBefore = await workflowRepository.count();

				await expect(
					importPackage({
						user: member,
						projectId: targetProject.id,
						packageBuffer,
						variableConflictPolicy: 'overwrite',
					}),
				).rejects.toThrow('You are not allowed to update global variables');

				expect(await workflowRepository.count()).toBe(workflowsBefore);
				expect(await variableLayout()).toEqual(
					expect.arrayContaining([{ key: 'API_URL', scope: 'global', value: 'from-global' }]),
				);
			});

			it('rejects an overwrite without projectVariable:update in the target project', async () => {
				const owner = await createOwner();
				const member = await createMember();
				const { packageBuffer } = await packageReferencing(owner, 'from-source');
				const personalProject = await getPersonalProject(member);
				await createProjectVariable('API_URL', 'from-personal', personalProject);
				const workflowsBefore = await workflowRepository.count();

				// A member may import into their own personal project, but the personal-owner role
				// does not carry projectVariable:update.
				await expect(
					importPackage({ user: member, packageBuffer, variableConflictPolicy: 'overwrite' }),
				).rejects.toThrow('You are not allowed to update variables in this project');

				expect(await workflowRepository.count()).toBe(workflowsBefore);
				expect((await variablesInProject(personalProject.id))[0].value).toBe('from-personal');
			});

			it('rejects an overwrite when the API key lacks the variable:update scope', async () => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { packageBuffer } = await packageReferencing(owner, 'from-source');
				await createProjectVariable('API_URL', 'from-target', targetProject);
				const workflowsBefore = await workflowRepository.count();

				await expect(
					importPackage({
						user: owner,
						projectId: targetProject.id,
						packageBuffer,
						apiKeyScopes: ['workflow:import'],
						variableConflictPolicy: 'overwrite',
					}),
				).rejects.toBeInstanceOf(ForbiddenError);

				expect(await workflowRepository.count()).toBe(workflowsBefore);
				expect((await variablesInProject(targetProject.id))[0].value).toBe('from-target');
			});

			it('overwrites for an API key carrying variable:update', async () => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { packageBuffer } = await packageReferencing(owner, 'from-source');
				await createProjectVariable('API_URL', 'from-target', targetProject);

				const result = await importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					apiKeyScopes: ['workflow:import', 'variable:update'],
					variableConflictPolicy: 'overwrite',
				});

				expect(result.variables).toMatchObject({ updated: ['API_URL'] });
				expect((await variablesInProject(targetProject.id))[0].value).toBe('from-source');
			});

			it('rejects an overwrite when variables are not licensed', async () => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { packageBuffer } = await packageReferencing(owner, 'from-source');
				await createProjectVariable('API_URL', 'from-target', targetProject);
				licenseMocker.disable('feat:variables');
				const workflowsBefore = await workflowRepository.count();

				await expect(
					importPackage({
						user: owner,
						projectId: targetProject.id,
						packageBuffer,
						variableConflictPolicy: 'overwrite',
					}),
				).rejects.toThrow(/license does not allow variables/);

				expect(await workflowRepository.count()).toBe(workflowsBefore);
				expect((await variablesInProject(targetProject.id))[0].value).toBe('from-target');
			});

			it('imports under fail without a variables licence, since nothing is written', async () => {
				const owner = await createOwner();
				const targetProject = await createTeamProject('Target', owner);
				const { packageBuffer } = await packageReferencing(owner, 'same-everywhere');
				await createProjectVariable('API_URL', 'same-everywhere', targetProject);
				licenseMocker.disable('feat:variables');

				const result = await importPackage({
					user: owner,
					projectId: targetProject.id,
					packageBuffer,
					variableConflictPolicy: 'fail',
				});

				expect(result.variables).toMatchObject({ matched: ['API_URL'] });
			});
		});
	});
});
