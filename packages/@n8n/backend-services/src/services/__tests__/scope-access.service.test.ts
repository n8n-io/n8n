import {
	CredentialsRepository,
	GLOBAL_MEMBER_ROLE,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	type User,
} from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { CredentialsFinderService } from '../../credentials/credentials-finder.service';
import {
	ProjectOwnedResourceScopeResolverRegistry,
	type ProjectOwnedResourceScopeResolver,
} from '../project-owned-resource-scope-resolver.registry';
import { ProjectScopeService } from '../project-scope.service';
import { RoleService } from '../role.service';
import { ScopeAccessService, type ScopeAccessResource } from '../scope-access.service';

const makeUser = (globalScopes: Scope[] = []) =>
	({
		id: 'user-1',
		role: { ...GLOBAL_MEMBER_ROLE, scopes: globalScopes.map((slug) => ({ slug })) },
	}) as User;

describe('ScopeAccessService', () => {
	const projectScopeService = mock<ProjectScopeService>();
	const roleService = mock<RoleService>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const credentialsRepository = mock<CredentialsRepository>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	let registry: ProjectOwnedResourceScopeResolverRegistry;
	let service: ScopeAccessService;

	beforeEach(() => {
		vi.clearAllMocks();
		registry = new ProjectOwnedResourceScopeResolverRegistry();
		service = new ScopeAccessService(
			projectScopeService,
			roleService,
			sharedWorkflowRepository,
			sharedCredentialsRepository,
			credentialsRepository,
			credentialsFinderService,
			registry,
		);
		projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
		roleService.rolesWithScopeInContext.mockResolvedValue([]);
		credentialsRepository.isInstanceCredential.mockResolvedValue(false);
		credentialsFinderService.hasGlobalReadOnlyAccess.mockReturnValue(false);
		credentialsFinderService.hasGlobalConnectAccess.mockReturnValue(false);
	});

	const hasScopes = async (
		resource: ScopeAccessResource,
		scopes: Scope[] = ['workflow:read'],
		user = makeUser(),
	) => await service.hasScopes({ user, scopes, resource });

	it('grants access from the global role without resource queries', async () => {
		await expect(
			hasScopes(
				{ type: 'project', projectId: 'project-2' },
				['project:read'],
				makeUser(['project:read']),
			),
		).resolves.toBe(true);
		expect(projectScopeService.getProjectIds).not.toHaveBeenCalled();
	});

	it('returns false for a global-only request without global access', async () => {
		await expect(
			service.hasScopes({
				user: makeUser(),
				scopes: ['project:read'],
				globalOnly: true,
				resource: { type: 'project', projectId: 'project-1' },
			}),
		).resolves.toBe(false);
		expect(projectScopeService.getProjectIds).not.toHaveBeenCalled();
	});

	it('checks project access against the scoped project IDs', async () => {
		await expect(hasScopes({ type: 'project', projectId: 'project-1' })).resolves.toBe(true);
		await expect(hasScopes({ type: 'project', projectId: 'project-2' })).resolves.toBe(false);
	});

	it('checks workflow sharing roles', async () => {
		roleService.rolesWithScopeInContext.mockResolvedValue(['workflow:owner']);
		sharedWorkflowRepository.findScopeAccess.mockResolvedValue({ exists: true, hasAccess: true });

		await expect(hasScopes({ type: 'workflow', workflowId: 'workflow-1' })).resolves.toBe(true);
		expect(sharedWorkflowRepository.findScopeAccess).toHaveBeenCalledWith(
			'workflow-1',
			['project-1'],
			['workflow:owner'],
			{},
		);
	});

	it('throws when the workflow does not exist', async () => {
		sharedWorkflowRepository.findScopeAccess.mockResolvedValue({ exists: false, hasAccess: false });

		await expect(hasScopes({ type: 'workflow', workflowId: 'missing' })).rejects.toThrow(
			'Workflow with ID "missing" not found.',
		);
	});

	it('checks credential sharing roles', async () => {
		roleService.rolesWithScopeInContext.mockResolvedValue(['credential:owner']);
		sharedCredentialsRepository.findScopeAccess.mockResolvedValue({
			exists: true,
			hasAccess: true,
		});

		await expect(
			hasScopes({ type: 'credential', credentialId: 'credential-1' }, ['credential:read']),
		).resolves.toBe(true);
	});

	it('grants supported instance credential management access', async () => {
		credentialsRepository.isInstanceCredential.mockResolvedValue(true);

		await expect(
			hasScopes(
				{ type: 'credential', credentialId: 'credential-1' },
				['credential:update'],
				makeUser(['credential:manageInstance']),
			),
		).resolves.toBe(true);
	});

	it('grants global read-only credential access', async () => {
		sharedCredentialsRepository.findScopeAccess.mockResolvedValue({
			exists: true,
			hasAccess: false,
		});
		credentialsFinderService.hasGlobalReadOnlyAccess.mockReturnValue(true);
		credentialsFinderService.findGlobalCredentialById.mockResolvedValue(
			mock({ isResolvable: false }),
		);

		await expect(
			hasScopes({ type: 'credential', credentialId: 'credential-1' }, ['credential:read']),
		).resolves.toBe(true);
	});

	it('requires resolvable global credentials for connect access', async () => {
		sharedCredentialsRepository.findScopeAccess.mockResolvedValue({
			exists: true,
			hasAccess: false,
		});
		credentialsFinderService.hasGlobalConnectAccess.mockReturnValue(true);
		credentialsFinderService.findGlobalCredentialById.mockResolvedValue(
			mock({ isResolvable: true }),
		);

		await expect(
			hasScopes({ type: 'credential', credentialId: 'credential-1' }, ['credential:connect']),
		).resolves.toBe(true);
	});

	it('throws when the credential does not exist', async () => {
		sharedCredentialsRepository.findScopeAccess.mockResolvedValue({
			exists: false,
			hasAccess: false,
		});

		await expect(
			hasScopes({ type: 'credential', credentialId: 'missing' }, ['credential:read']),
		).rejects.toThrow('Credential with ID "missing" not found.');
	});

	it('resolves module resources through their owning project', async () => {
		registry.register(
			'dataTable',
			mock<ProjectOwnedResourceScopeResolver>({ findProjectId: async () => 'project-1' }),
		);

		await expect(
			hasScopes({ type: 'moduleResource', resourceType: 'dataTable', resourceId: 'table-1' }),
		).resolves.toBe(true);
	});

	it('treats an unregistered module resource as missing', async () => {
		await expect(
			hasScopes({ type: 'moduleResource', resourceType: 'dataTable', resourceId: 'missing' }),
		).rejects.toThrow('Data table with ID "missing" not found.');
	});
});
