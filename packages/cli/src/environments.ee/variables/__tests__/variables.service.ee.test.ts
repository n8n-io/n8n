import type { LicenseState } from '@n8n/backend-common';
import type { CacheService, EventService } from '@n8n/backend-services';
import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import type { OperationContext, Project, User, Variables, VariablesRepository } from '@n8n/db';
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
});
