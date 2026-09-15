import type { GlobalConfig } from '@n8n/config';
import type { AuthRolesService, SettingsRepository } from '@n8n/db';
import type { Role as RoleDTO } from '@n8n/permissions';
import {
	CANVAS_ONLY_PERSONAL_SPACE_ROLE_SETTING,
	PROJECT_OWNER_ROLE_SLUG,
	PROJECT_SCOPE_MAP,
	parseRemovedPersonalSpaceScopes,
} from '@n8n/permissions';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { CanvasOnlyPersonalSpaceRoleService } from '@/services/canvas-only-personal-space-role.service';
import type { RoleCacheService } from '@/services/role-cache.service';
import type { RoleService } from '@/services/role.service';
import type { Telemetry } from '@/telemetry';

const SETTINGS_KEY = CANVAS_ONLY_PERSONAL_SPACE_ROLE_SETTING.key;

describe('CanvasOnlyPersonalSpaceRoleService', () => {
	const globalConfig = mock<GlobalConfig>({ canvasOnly: true });
	const roleService = mock<RoleService>();
	const authRolesService = mock<AuthRolesService>();
	const roleCacheService = mock<RoleCacheService>();
	const settingsRepository = mock<SettingsRepository>();
	const telemetry = mock<Telemetry>();

	const service = new CanvasOnlyPersonalSpaceRoleService(
		globalConfig,
		roleService,
		authRolesService,
		roleCacheService,
		settingsRepository,
		telemetry,
	);

	const removableScopes = CANVAS_ONLY_PERSONAL_SPACE_ROLE_SETTING.scopes;
	/** The real default scopes of the role, so the tests cannot drift from them. */
	const defaultScopes: string[] = [...PROJECT_SCOPE_MAP[PROJECT_OWNER_ROLE_SLUG]];
	const without = (...removed: string[]) => defaultScopes.filter((s) => !removed.includes(s));
	const withoutCredentialCreate = without('credential:create');

	it('models the role with its real default scopes', () => {
		expect(defaultScopes).toEqual(expect.arrayContaining(removableScopes));
		expect(defaultScopes).toEqual(expect.arrayContaining(['credential:update', 'workflow:delete']));
		expect(defaultScopes).not.toContain('project:delete');
	});

	/** The role as stored, which the service reads before and after the change. */
	let storedScopes: string[];
	/** The stored setting, which the simulated role sync reads. */
	let storedChoice: string | undefined;

	const body = (scopes: string[]) => ({
		displayName: 'Project Owner',
		description: 'Owner of a personal project',
		scopes,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		globalConfig.canvasOnly = true;
		storedScopes = [...defaultScopes];
		storedChoice = undefined;

		roleService.getRole.mockImplementation(
			async () =>
				({
					slug: PROJECT_OWNER_ROLE_SLUG,
					displayName: 'Project Owner',
					description: 'Owner of a personal project',
					systemRole: true,
					roleType: 'project',
					scopes: storedScopes,
				}) as unknown as RoleDTO,
		);
		settingsRepository.upsertByKey.mockImplementation(async (_key, value) => {
			storedChoice = value;
		});
		// The real sync resets the role to its defaults and then applies the stored choice.
		authRolesService.init.mockImplementation(async () => {
			storedScopes = without(...parseRemovedPersonalSpaceScopes(storedChoice));
		});
	});

	describe('isActiveFor', () => {
		it('is active for the personal space role in canvas-only mode', () => {
			expect(service.isActiveFor(PROJECT_OWNER_ROLE_SLUG)).toBe(true);
		});

		it('is not active for another role', () => {
			expect(service.isActiveFor('project:admin')).toBe(false);
			expect(service.isActiveFor('project:custom-abc123')).toBe(false);
		});

		it('is not active when canvas-only mode is off', () => {
			globalConfig.canvasOnly = false;

			expect(service.isActiveFor(PROJECT_OWNER_ROLE_SLUG)).toBe(false);
		});
	});

	describe('updateRole', () => {
		/** Calls the service as a caller with `role:manage`, unless a test says otherwise. */
		const update = async (
			newRole: Parameters<typeof service.updateRole>[0],
			callerScopes: string[] = ['role:manage'],
		) => await service.updateRole(newRole, callerScopes);

		it('rejects a caller with role:manageProject but not role:manage', async () => {
			await expect(
				update(body(withoutCredentialCreate), ['role:read', 'role:manageProject']),
			).rejects.toThrow(ForbiddenError);
			expect(roleService.getRole).not.toHaveBeenCalled();
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
			expect(authRolesService.init).not.toHaveBeenCalled();
		});

		it('rejects a caller with no scopes', async () => {
			await expect(update(body(withoutCredentialCreate), [])).rejects.toThrow(ForbiddenError);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});

		it('removes credential:create, stores the choice and reports it', async () => {
			const result = await update(body(withoutCredentialCreate));

			expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(
				SETTINGS_KEY,
				JSON.stringify(['credential:create']),
				false,
				{},
			);
			expect(authRolesService.init).toHaveBeenCalledTimes(1);
			expect(roleCacheService.invalidateCache).toHaveBeenCalledTimes(1);
			expect(result.scopes).toEqual(withoutCredentialCreate);
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.ROLES.USER_UPDATED_PERSONAL_SPACE_ROLE,
				{},
			);
		});

		it('stores the choice before it re-syncs the roles', async () => {
			const order: string[] = [];
			settingsRepository.upsertByKey.mockImplementation(async () => {
				order.push('store');
			});
			authRolesService.init.mockImplementation(async () => {
				order.push('sync');
			});
			roleCacheService.invalidateCache.mockImplementation(async () => {
				order.push('invalidate');
			});

			await update(body(withoutCredentialCreate));

			expect(order).toEqual(['store', 'sync', 'invalidate']);
		});

		it.each(['dataTable:create', 'agent:create'])('removes %s on its own', async (scope) => {
			const result = await update(body(without(scope)));

			expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(
				SETTINGS_KEY,
				JSON.stringify([scope]),
				false,
				{},
			);
			expect(result.scopes).not.toContain(scope);
			expect(result.scopes).toEqual(expect.arrayContaining(without(scope)));
		});

		it('removes all removable scopes at once', async () => {
			const result = await update(body(without(...removableScopes)));

			expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(
				SETTINGS_KEY,
				JSON.stringify(removableScopes),
				false,
				{},
			);
			expect(result.scopes).toEqual(without(...removableScopes));
		});

		it('adds credential:create back and clears the stored choice', async () => {
			storedScopes = [...withoutCredentialCreate];

			const result = await update(body(defaultScopes));

			expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(
				SETTINGS_KEY,
				JSON.stringify([]),
				false,
				{},
			);
			expect(authRolesService.init).toHaveBeenCalledTimes(1);
			expect(result.scopes).toContain('credential:create');
		});

		it('rejects a scope that is not a default scope of the role', async () => {
			await expect(update(body([...defaultScopes, 'project:delete']))).rejects.toThrow(
				BadRequestError,
			);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
			expect(authRolesService.init).not.toHaveBeenCalled();
		});

		it.each(['workflow:create', 'credential:read', 'workflow:delete'])(
			'rejects removing the default scope %s',
			async (scope) => {
				await expect(update(body(without(scope)))).rejects.toThrow(
					`The following scopes cannot be removed from the personal space role: ${scope}`,
				);
				expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
				expect(authRolesService.init).not.toHaveBeenCalled();
			},
		);

		it('accepts every default scope of the role', async () => {
			const result = await update(body(defaultScopes));

			expect(result.scopes).toEqual(
				expect.arrayContaining(['credential:update', 'workflow:delete']),
			);
		});

		it('rejects a changed display name', async () => {
			await expect(update({ ...body(defaultScopes), displayName: 'Renamed' })).rejects.toThrow(
				BadRequestError,
			);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});

		it('rejects a changed description', async () => {
			await expect(
				update({ ...body(defaultScopes), description: 'Something else' }),
			).rejects.toThrow(BadRequestError);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});

		it('leaves the role alone when the body carries no scopes', async () => {
			const result = await update({ displayName: 'Project Owner' });

			expect(result.scopes).toEqual(defaultScopes);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
			expect(authRolesService.init).not.toHaveBeenCalled();
		});
	});
});
