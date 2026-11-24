import { ProjectScopeService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { authorizeAgainstGrant } from '../grant-authorization';

const user = mock<User>({ id: 'user-1' });
const workflowFinderService = mock<WorkflowFinderService>();
const projectScopeService = mock<ProjectScopeService>();
Container.set(ProjectScopeService, projectScopeService);

const appGrant = {
	audiences: ['aud'],
	projectAccess: { projectId: 'project-1', scopes: ['app:read'] },
};

const withExecuteAccessTo = (...workflowIds: string[]) => {
	workflowFinderService.findWorkflowIdsWithScopeForUser.mockImplementation(
		async (requested) => new Set(requested.filter((id) => workflowIds.includes(id))),
	);
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe('authorizeAgainstGrant', () => {
	it('allows a holder who still has execute access on the named workflow', async () => {
		withExecuteAccessTo('wf-1');

		await expect(
			authorizeAgainstGrant(
				workflowFinderService,
				{ audiences: ['aud'], executeAccessWorkflowId: 'wf-1' },
				user,
			),
		).resolves.toBe(true);
		expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledWith(
			['wf-1'],
			user,
			['workflow:execute'],
		);
	});

	it('denies a holder who has lost it', async () => {
		withExecuteAccessTo();

		await expect(
			authorizeAgainstGrant(
				workflowFinderService,
				{ audiences: ['aud'], executeAccessWorkflowId: 'wf-1' },
				user,
			),
		).resolves.toBe(false);
	});

	it('names no workflow when the trigger does not require execute access', async () => {
		await expect(
			authorizeAgainstGrant(workflowFinderService, { audiences: ['aud'] }, user),
		).resolves.toBe(true);
		expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
		expect(projectScopeService.hasScopes).not.toHaveBeenCalled();
	});

	it('allows a holder who still has the scopes in the named project', async () => {
		projectScopeService.hasScopes.mockResolvedValue(true);

		await expect(authorizeAgainstGrant(workflowFinderService, appGrant, user)).resolves.toBe(true);
		expect(projectScopeService.hasScopes).toHaveBeenCalledWith(user, 'project-1', ['app:read']);
	});

	it('denies a holder who has lost the scopes in the named project', async () => {
		projectScopeService.hasScopes.mockResolvedValue(false);

		await expect(authorizeAgainstGrant(workflowFinderService, appGrant, user)).resolves.toBe(false);
	});

	it('denies a grant that names an unknown scope', async () => {
		projectScopeService.hasScopes.mockResolvedValue(true);

		await expect(
			authorizeAgainstGrant(
				workflowFinderService,
				{ audiences: ['aud'], projectAccess: { projectId: 'project-1', scopes: ['not:a-scope'] } },
				user,
			),
		).resolves.toBe(false);
		expect(projectScopeService.hasScopes).not.toHaveBeenCalled();
	});

	describe('when the grant names both a workflow and a project', () => {
		const grant = { ...appGrant, executeAccessWorkflowId: 'wf-1' };

		it('allows a holder who passes both', async () => {
			withExecuteAccessTo('wf-1');
			projectScopeService.hasScopes.mockResolvedValue(true);

			await expect(authorizeAgainstGrant(workflowFinderService, grant, user)).resolves.toBe(true);
		});

		it('denies a holder who has lost workflow access, without checking the project', async () => {
			withExecuteAccessTo();
			projectScopeService.hasScopes.mockResolvedValue(true);

			await expect(authorizeAgainstGrant(workflowFinderService, grant, user)).resolves.toBe(false);
			expect(projectScopeService.hasScopes).not.toHaveBeenCalled();
		});

		it('denies a holder who has lost the project scopes', async () => {
			withExecuteAccessTo('wf-1');
			projectScopeService.hasScopes.mockResolvedValue(false);

			await expect(authorizeAgainstGrant(workflowFinderService, grant, user)).resolves.toBe(false);
		});
	});
});
