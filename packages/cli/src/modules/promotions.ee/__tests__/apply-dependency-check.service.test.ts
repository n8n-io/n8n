import type { GlobalConfig } from '@n8n/config';
import type {
	Project,
	SharedWorkflowRepository,
	User,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { PackageImportPlan } from '@/modules/n8n-packages/engine/project-package-importer';
import type {
	InventoryWorkflow,
	PackageDirectoryInventory,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import type { ProjectService } from '@/services/project.service.ee';

import { ApplyDependencyCheckService } from '../apply-dependency-check.service';
import type { WorkflowReference } from '../package-references';

const userWith = (...scopes: Scope[]) =>
	({ role: { slug: 'custom', scopes: scopes.map((slug) => ({ slug })) } }) as User;

const workflowRow = (id: string, row: Partial<WorkflowEntity> = {}) =>
	({ id, isArchived: false, settings: undefined, ...row }) as WorkflowEntity;

const project = (id: string, type: Project['type'] = 'team') => ({ id, type }) as Project;

const reference = (id: string): WorkflowReference => ({ id, workflows: [] });

describe('ApplyDependencyCheckService', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const projectService = mock<ProjectService>();
	const service = new ApplyDependencyCheckService(
		workflowRepository,
		sharedWorkflowRepository,
		projectService,
		mock<GlobalConfig>({ workflows: { callerPolicyDefaultOption: 'none' } }),
	);

	/** The package holds the projects `alpha` and `beta`. Beta holds the credential and `on-branch`. */
	const facts = async ({
		user = userWith(),
		references = [],
		removedIds = [],
		wholeInstance = false,
	}: {
		user?: User;
		references?: WorkflowReference[];
		removedIds?: string[];
		wholeInstance?: boolean;
	}) =>
		await service.facts({
			plan: {
				request: { user },
				scopes: [{ plan: { removalPlan: { removals: removedIds.map((id) => ({ id })) } } }],
			} as unknown as PackageImportPlan,
			inventory: {
				projects: [{ id: 'alpha' }, { id: 'beta' }],
				workflows: [
					{ id: 'applied', projectId: 'alpha' },
					{ id: 'on-branch', projectId: 'beta' },
				],
				credentials: [{ projectId: 'beta' }, { projectId: null }],
			} as unknown as PackageDirectoryInventory,
			applied: [{ id: 'applied', projectId: 'alpha' }] as InventoryWorkflow[],
			references,
			wholeInstance,
		});

	beforeEach(() => {
		vi.resetAllMocks();
		workflowRepository.findByIds.mockResolvedValue([]);
		sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(new Map());
		projectService.getProjectIdsWithScope.mockResolvedValue([]);
		projectService.findExistingProjectIds.mockResolvedValue(new Set());
	});

	it('gives the default caller policy and the applied workflows, and reads no workflow without a reference', async () => {
		const result = await facts({});

		expect(result.callerPolicyDefault).toBe('none');
		expect([...result.appliedWorkflowIds]).toEqual(['applied']);
		expect(result.instanceWorkflows.size).toBe(0);
		expect(workflowRepository.findByIds).not.toHaveBeenCalled();
	});

	it('lets a project member create a credential only in a project that grants it', async () => {
		const user = userWith();
		projectService.getProjectIdsWithScope.mockResolvedValue(['beta']);

		const result = await facts({ user });

		expect([...result.credentialProjectIds]).toEqual(['beta']);
		expect(projectService.getProjectIdsWithScope).toHaveBeenCalledWith(
			user,
			['credential:create'],
			['beta'],
		);
		// Without the scope to create projects, a missing project gives no access.
		expect(projectService.findExistingProjectIds).not.toHaveBeenCalled();
	});

	it('lets a user who can create projects create a credential in a project that this instance lacks', async () => {
		const result = await facts({ user: userWith('project:create') });

		expect([...result.credentialProjectIds]).toEqual(['beta']);
	});

	it('gives a user who can create projects no access to an existing project', async () => {
		projectService.findExistingProjectIds.mockResolvedValue(new Set(['beta']));

		const result = await facts({ user: userWith('project:create') });

		expect([...result.credentialProjectIds]).toEqual([]);
	});

	it('reads the state and the owner project of a referenced workflow that the Apply does not import', async () => {
		workflowRepository.findByIds.mockResolvedValue([
			workflowRow('target', { isArchived: true, settings: { callerPolicy: 'any' } }),
			workflowRow('orphan'),
		]);
		sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
			new Map([['target', project('gamma')]]),
		);

		const result = await facts({
			references: [reference('applied'), reference('target'), reference('orphan')],
		});

		expect(workflowRepository.findByIds).toHaveBeenCalledWith(['target', 'orphan'], {
			fields: ['isArchived', 'settings'],
		});
		expect([...result.instanceWorkflows]).toEqual([
			['target', { isArchived: true, settings: { callerPolicy: 'any' }, projectId: 'gamma' }],
			['orphan', { isArchived: false, settings: undefined, projectId: null }],
		]);
	});

	it('leaves out a workflow that the Apply deletes', async () => {
		workflowRepository.findByIds.mockResolvedValue([workflowRow('kept'), workflowRow('removed')]);

		const result = await facts({
			references: [reference('kept'), reference('removed')],
			removedIds: ['removed'],
		});

		expect([...result.instanceWorkflows.keys()]).toEqual(['kept']);
	});

	it('leaves out a workflow of a team project that an Apply of the whole instance deletes', async () => {
		workflowRepository.findByIds.mockResolvedValue([
			workflowRow('in-package-project'),
			workflowRow('in-other-team-project'),
			workflowRow('in-personal-project'),
		]);
		sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
			new Map([
				['in-package-project', project('alpha')],
				['in-other-team-project', project('gamma')],
				['in-personal-project', project('personal', 'personal')],
			]),
		);
		const references = [
			reference('in-package-project'),
			reference('in-other-team-project'),
			reference('in-personal-project'),
		];

		const wholeInstance = await facts({ references, wholeInstance: true });
		const projectOnly = await facts({ references });

		expect([...wholeInstance.instanceWorkflows.keys()]).toEqual([
			'in-package-project',
			'in-personal-project',
		]);
		// A project Apply deletes no project.
		expect(projectOnly.instanceWorkflows.size).toBe(3);
	});

	it('reads the access to the projects that hold a referenced workflow, on the branch or on this instance', async () => {
		const user = userWith();
		workflowRepository.findByIds.mockResolvedValue([workflowRow('target')]);
		sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
			new Map([['target', project('gamma')]]),
		);
		projectService.getProjectIdsWithScope.mockImplementation(async (_user, scopes) =>
			scopes.includes('project:read') ? ['gamma'] : [],
		);

		const result = await facts({
			user,
			references: [reference('target'), reference('on-branch'), reference('missing')],
		});

		expect(projectService.getProjectIdsWithScope).toHaveBeenCalledWith(
			user,
			['project:read'],
			['beta', 'gamma'],
		);
		expect([...result.readableProjectIds]).toEqual(['gamma']);
	});

	it('gives a user who reads every project access to a project that this instance lacks', async () => {
		const result = await facts({
			user: userWith('project:read'),
			references: [reference('on-branch')],
		});

		expect([...result.readableProjectIds]).toEqual(['beta']);
	});
});
