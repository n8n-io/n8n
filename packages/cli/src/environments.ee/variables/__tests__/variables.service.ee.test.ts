import type { LicenseState } from '@n8n/backend-common';
import type { CacheService, EventService } from '@n8n/backend-services';
import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import type {
	OperationContext,
	Project,
	Role,
	Scope,
	User,
	Variables,
	VariablesRepository,
} from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { ProjectService } from '@/services/project.service.ee';

import { VariablesService } from '../variables.service.ee';

describe('VariablesService', () => {
	const cacheService = mock<CacheService>();
	const variablesRepository = mock<VariablesRepository>();
	const eventService = mock<EventService>();
	const licenseState = mock<LicenseState>();
	const projectService = mock<ProjectService>();
	const variablesService = new VariablesService(
		cacheService,
		variablesRepository,
		eventService,
		licenseState,
		projectService,
	);

	const user = mock<User>({ id: 'user-id' });
	const project = mock<Project>({ id: 'project-1' });
	const variable = mock<Variables>({ id: 'variable-id', key: 'KEY', project });

	beforeEach(() => {
		vi.clearAllMocks();
		licenseState.isVariablesLicensed.mockReturnValue(true);
		licenseState.getMaxVariables.mockReturnValue(UNLIMITED_LICENSE_QUOTA);
		projectService.getProjectWithScope.mockResolvedValue(project);
		cacheService.get.mockResolvedValue([variable]);
		variablesRepository.find.mockResolvedValue([variable]);
		variablesRepository.save.mockResolvedValue(mock<Variables>({ id: 'new-id', key: 'NEW_KEY' }));
	});

	const actions = [
		{
			action: 'create',
			eventName: 'variable-created',
			run: async (ctx?: OperationContext) =>
				await variablesService.create(
					user,
					{ key: 'NEW_KEY', type: 'string', value: 'value', projectId: 'project-1' },
					ctx,
				),
		},
		{
			action: 'update',
			eventName: 'variable-updated',
			run: async (ctx?: OperationContext) =>
				await variablesService.update(user, 'variable-id', { value: 'changed' }, ctx),
		},
		{
			action: 'deleteForUser',
			eventName: 'variable-deleted',
			run: async (ctx?: OperationContext) =>
				await variablesService.deleteForUser(user, 'variable-id', ctx),
		},
	];

	it.each(actions)(
		'$action passes the login id to the $eventName event',
		async ({ run, eventName }) => {
			await run({ security: mock<SecurityContext>({ subIdentityId: 'login-1' }) });

			expect(eventService.emit).toHaveBeenCalledWith(
				eventName,
				expect.objectContaining({ loginId: 'login-1' }),
			);
		},
	);

	it.each(actions)(
		'$action emits no login id without an operation context',
		async ({ run, eventName }) => {
			await run();

			const call = eventService.emit.mock.calls.find(([name]) => name === eventName);
			expect(call?.[1]).toMatchObject({ loginId: undefined });
		},
	);

	describe('moving a variable to a scope with a same-key variable', () => {
		it('rejects the move when the destination project already has the same key', async () => {
			const variableInProject1 = mock<Variables>({
				id: 'variable-a',
				key: 'SHARED_KEY',
				project: mock<Project>({ id: 'project-1' }),
			});
			const variableInProject2 = mock<Variables>({
				id: 'variable-b',
				key: 'SHARED_KEY',
				project: mock<Project>({ id: 'project-2' }),
			});
			cacheService.get.mockResolvedValue([variableInProject1, variableInProject2]);

			await expect(
				variablesService.update(user, 'variable-a', { projectId: 'project-2' }),
			).rejects.toThrow('A variable with key "SHARED_KEY" already exists in the specified project');
			expect(variablesRepository.update).not.toHaveBeenCalled();
		});

		it('rejects the move to global when a global variable with the same key exists', async () => {
			const userWithGlobalScope = mock<User>({
				id: 'user-id',
				role: mock<Role>({
					slug: 'global:admin',
					scopes: [mock<Scope>({ slug: 'variable:update' })],
				}),
			});
			const variableInProject = mock<Variables>({
				id: 'variable-a',
				key: 'SHARED_KEY',
				project: mock<Project>({ id: 'project-1' }),
			});
			const globalVariable = mock<Variables>({
				id: 'variable-b',
				key: 'SHARED_KEY',
				project: null,
			});
			cacheService.get.mockResolvedValue([variableInProject, globalVariable]);

			await expect(
				variablesService.update(userWithGlobalScope, 'variable-a', { projectId: null }),
			).rejects.toThrow('A global variable with key "SHARED_KEY" already exists');
			expect(variablesRepository.update).not.toHaveBeenCalled();
		});

		it('allows the move when the destination project has no same-key variable', async () => {
			const variableInProject1 = mock<Variables>({
				id: 'variable-a',
				key: 'KEY_A',
				project: mock<Project>({ id: 'project-1' }),
			});
			const variableInProject2 = mock<Variables>({
				id: 'variable-b',
				key: 'KEY_B',
				project: mock<Project>({ id: 'project-2' }),
			});
			cacheService.get.mockResolvedValue([variableInProject1, variableInProject2]);
			variablesRepository.update.mockResolvedValue({} as never);

			const updated = await variablesService.update(user, 'variable-a', { projectId: 'project-2' });

			expect(updated.key).toBe('KEY_A');
		});

		it('validates the renamed key, not the colliding old key, when moving and renaming together', async () => {
			const variableInProject1 = mock<Variables>({
				id: 'variable-a',
				key: 'SHARED_KEY',
				project: mock<Project>({ id: 'project-1' }),
			});
			const variableInProject2 = mock<Variables>({
				id: 'variable-b',
				key: 'SHARED_KEY',
				project: mock<Project>({ id: 'project-2' }),
			});
			cacheService.get.mockResolvedValue([variableInProject1, variableInProject2]);
			variablesRepository.update.mockResolvedValue({} as never);

			await variablesService.update(user, 'variable-a', {
				key: 'KEY_A',
				projectId: 'project-2',
			});

			// The move proceeds: the key that lands in the destination (`KEY_A`) is unique there.
			expect(variablesRepository.update).toHaveBeenCalledWith(
				'variable-a',
				expect.objectContaining({ key: 'KEY_A', project: { id: 'project-2' } }),
			);
		});
	});
});
