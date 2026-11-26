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

import type { CredentialsService } from '@/credentials/credentials.service';
import type { PackageImportPlan } from '@/modules/n8n-packages/engine/project-package-importer';
import type {
	InventoryWorkflow,
	PackageDirectoryInventory,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import type { BlockingIssue } from '@/modules/n8n-packages/n8n-packages.types';
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
	const credentialsService = mock<CredentialsService>();
	const service = new ApplyDependencyCheckService(
		workflowRepository,
		sharedWorkflowRepository,
		projectService,
		credentialsService,
		mock<GlobalConfig>({ workflows: { callerPolicyDefaultOption: 'none' } }),
	);

	/**
	 * The package holds the projects `alpha`, `beta` and `gamma`. Beta holds `on-branch` and the
	 * credential `beta-key`. By default, the plan does not find `beta-key`.
	 */
	const facts = async ({
		user = userWith(),
		references = [],
		removedIds = [],
		missingCredentialIds = ['beta-key'],
		wholeInstance = false,
		selectionOpen = false,
		issues = [],
	}: {
		user?: User;
		references?: WorkflowReference[];
		removedIds?: string[];
		missingCredentialIds?: string[];
		wholeInstance?: boolean;
		selectionOpen?: boolean;
		issues?: BlockingIssue[];
	}) =>
		await service.facts({
			plan: {
				request: { user },
				scopes: [{ plan: { removalPlan: { removals: removedIds.map((id) => ({ id })) } } }],
				issues: [
					{ type: 'workflow-conflict', sourceWorkflowId: 'applied' },
					...missingCredentialIds.map((sourceId) => ({ type: 'credential-unresolved', sourceId })),
					...issues,
				],
			} as unknown as PackageImportPlan,
			inventory: {
				projects: [{ id: 'alpha' }, { id: 'beta' }, { id: 'gamma' }],
				workflows: [
					{ id: 'applied', projectId: 'alpha' },
					{ id: 'on-branch', projectId: 'beta' },
				],
				credentials: [
					{ projectId: 'beta', credential: { id: 'beta-key' } },
					{ projectId: 'gamma', credential: { id: 'gamma-key' } },
					{ projectId: null, credential: { id: 'top-level-key' } },
				],
			} as unknown as PackageDirectoryInventory,
			applied: [{ id: 'applied', projectId: 'alpha' }] as InventoryWorkflow[],
			references,
			wholeInstance,
			selectionOpen,
		});

	beforeEach(() => {
		vi.resetAllMocks();
		workflowRepository.findByIds.mockResolvedValue([]);
		sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(new Map());
		projectService.getProjectIdsWithScope.mockResolvedValue([]);
		projectService.findExistingProjectIds.mockResolvedValue(new Set());
		credentialsService.findUsageScopes.mockResolvedValue(new Map());
	});

	it('gives the default caller policy and the applied workflows, and reads no workflow without a reference', async () => {
		const result = await facts({});

		expect(result.callerPolicyDefault).toBe('none');
		expect([...result.appliedWorkflowIds]).toEqual(['applied']);
		expect(result.instanceWorkflows.size).toBe(0);
		expect(result.removedWorkflowIds.size).toBe(0);
		expect(result.selectableWorkflowIds.size).toBe(0);
		expect(workflowRepository.findByIds).not.toHaveBeenCalled();
	});

	it('reads the access only to the owner projects of the credentials that the plan does not find', async () => {
		const user = userWith('project:create');

		await facts({ user, missingCredentialIds: ['gamma-key', 'top-level-key', 'no-file'] });

		expect(projectService.getProjectIdsWithScope).toHaveBeenCalledWith(
			user,
			['credential:create'],
			['gamma'],
		);
		expect(projectService.findExistingProjectIds).toHaveBeenCalledWith(['gamma']);
	});

	it('reads no access to a credential project when the plan finds every credential', async () => {
		const result = await facts({
			user: userWith('project:create'),
			missingCredentialIds: [],
		});

		expect(result.credentialProjectIds.size).toBe(0);
		expect(projectService.getProjectIdsWithScope).not.toHaveBeenCalled();
		expect(projectService.findExistingProjectIds).not.toHaveBeenCalled();
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

	it('reads which of the credentials that the plan did not find exist on this instance', async () => {
		const unresolved = (
			sourceId: string,
			kind: Extract<BlockingIssue, { type: 'credential-unresolved' }>['kind'] = 'not_found',
		): BlockingIssue => ({ type: 'credential-unresolved', kind, sourceId, usedBy: [] });
		credentialsService.findUsageScopes.mockResolvedValue(new Map([['unshared', 'project']]));

		const result = await facts({
			issues: [
				unresolved('unshared'),
				unresolved('missing'),
				// Two projects of the package raise the issue for one credential.
				unresolved('missing'),
				unresolved('other-type', 'type_mismatch'),
				{ type: 'policy-check-failed', point: 'contentImport' },
			],
		});

		// The lookup does not depend on the access of the user.
		expect(credentialsService.findUsageScopes).toHaveBeenCalledWith(['unshared', 'missing']);
		expect([...result.unusableCredentials]).toEqual([['unshared', 'project']]);
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

	it('keeps the state and the owner project of a workflow that the Apply deletes', async () => {
		workflowRepository.findByIds.mockResolvedValue([workflowRow('kept'), workflowRow('removed')]);
		sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
			new Map([['removed', project('alpha')]]),
		);

		const result = await facts({
			references: [reference('kept'), reference('removed')],
			removedIds: ['removed', 'not-referenced'],
		});

		expect([...result.removedWorkflowIds]).toEqual(['removed']);
		expect(result.instanceWorkflows.get('removed')).toEqual({
			isArchived: false,
			settings: undefined,
			projectId: 'alpha',
		});
		expect([...result.instanceWorkflows.keys()]).toEqual(['kept', 'removed']);
		// The selection is known, so no entry depends on it.
		expect(result.selectableWorkflowIds.size).toBe(0);
	});

	it('marks a workflow of a team project that an Apply of the whole instance deletes', async () => {
		workflowRepository.findByIds.mockResolvedValue([
			workflowRow('in-package-project'),
			workflowRow('in-other-team-project'),
			workflowRow('in-personal-project'),
		]);
		sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
			new Map([
				['in-package-project', project('alpha')],
				['in-other-team-project', project('delta')],
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

		expect([...wholeInstance.removedWorkflowIds]).toEqual(['in-other-team-project']);
		expect(wholeInstance.instanceWorkflows.get('in-other-team-project')?.projectId).toBe('delta');
		expect(wholeInstance.instanceWorkflows.size).toBe(3);
		// A project Apply deletes no project.
		expect(projectOnly.removedWorkflowIds.size).toBe(0);
		expect(projectOnly.instanceWorkflows.size).toBe(3);
	});

	it('reads the access to the project of a workflow that the Apply deletes', async () => {
		const user = userWith();
		workflowRepository.findByIds.mockResolvedValue([workflowRow('removed')]);
		sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
			new Map([['removed', project('delta')]]),
		);
		projectService.getProjectIdsWithScope.mockImplementation(async (_user, scopes) =>
			scopes.includes('project:read') ? ['delta'] : [],
		);

		const result = await facts({
			user,
			references: [reference('removed')],
			removedIds: ['removed'],
		});

		expect(projectService.getProjectIdsWithScope).toHaveBeenCalledWith(
			user,
			['project:read'],
			['delta'],
		);
		expect([...result.readableProjectIds]).toEqual(['delta']);
	});

	it('with an open selection, also reads the applied workflows and makes the planned changes selectable', async () => {
		workflowRepository.findByIds.mockResolvedValue([
			workflowRow('applied'),
			workflowRow('removed'),
		]);
		sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
			new Map([
				['applied', project('alpha')],
				['removed', project('alpha')],
			]),
		);
		const references = [reference('applied'), reference('removed'), reference('other')];

		const open = await facts({ references, removedIds: ['removed'], selectionOpen: true });

		expect(workflowRepository.findByIds).toHaveBeenCalledWith(['applied', 'removed', 'other'], {
			fields: ['isArchived', 'settings'],
		});
		expect([...open.instanceWorkflows.keys()]).toEqual(['applied', 'removed']);
		expect([...open.selectableWorkflowIds]).toEqual(['applied', 'removed']);

		const known = await facts({ references, removedIds: ['removed'] });

		expect(workflowRepository.findByIds).toHaveBeenLastCalledWith(['removed', 'other'], {
			fields: ['isArchived', 'settings'],
		});
		expect(known.selectableWorkflowIds.size).toBe(0);
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
