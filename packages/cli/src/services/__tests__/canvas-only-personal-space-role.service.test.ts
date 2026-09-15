import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { Settings, SettingsRepository } from '@n8n/db';
import type { Role as RoleDTO } from '@n8n/permissions';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { CanvasOnlyPersonalSpaceRoleService } from '@/services/canvas-only-personal-space-role.service';
import type { RoleService } from '@/services/role.service';
import type { Telemetry } from '@/telemetry';

const SETTINGS_KEY = 'canvasOnly.personalSpaceRoleRemovedScopes';

describe('CanvasOnlyPersonalSpaceRoleService', () => {
	const globalConfig = mock<GlobalConfig>({ canvasOnly: true });
	const roleService = mock<RoleService>();
	const settingsRepository = mock<SettingsRepository>();
	const telemetry = mock<Telemetry>();
	const logger = mock<Logger>();

	const service = new CanvasOnlyPersonalSpaceRoleService(
		globalConfig,
		roleService,
		settingsRepository,
		telemetry,
		logger,
	);

	const defaultScopes = [
		'workflow:create',
		'workflow:update',
		'credential:create',
		'credential:read',
	];
	const withoutCredentialCreate = defaultScopes.filter((s) => s !== 'credential:create');

	/** The role as stored, which the service reads before and after the change. */
	let storedScopes: string[];

	const body = (scopes: string[]) => ({
		displayName: 'Project Owner',
		description: 'Owner of a personal project',
		scopes,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		globalConfig.canvasOnly = true;
		storedScopes = [...defaultScopes];

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
		roleService.removeScopesFromRole.mockImplementation(async (_slug, scopeSlugs) => {
			storedScopes = storedScopes.filter((s) => !scopeSlugs.includes(s));
		});
		roleService.addScopesToRole.mockImplementation(async (_slug, scopeSlugs) => {
			storedScopes = [...new Set([...storedScopes, ...scopeSlugs])];
		});
		settingsRepository.findByKey.mockResolvedValue(null);
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
		it('removes credential:create, stores the choice and reports it', async () => {
			const result = await service.updateRole(body(withoutCredentialCreate), 'user-id');

			expect(roleService.removeScopesFromRole).toHaveBeenCalledWith(PROJECT_OWNER_ROLE_SLUG, [
				'credential:create',
			]);
			expect(roleService.addScopesToRole).not.toHaveBeenCalled();
			expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(
				SETTINGS_KEY,
				JSON.stringify(['credential:create']),
				false,
				{},
			);
			expect(result.scopes).toEqual(withoutCredentialCreate);
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.ROLES.USER_UPDATED_PERSONAL_SPACE_ROLE,
				{
					user_id: 'user-id',
					scopes: withoutCredentialCreate,
					removed_scopes: ['credential:create'],
				},
			);
		});

		it('adds credential:create back and clears the stored choice', async () => {
			storedScopes = [...withoutCredentialCreate];

			const result = await service.updateRole(body(defaultScopes), 'user-id');

			expect(roleService.addScopesToRole).toHaveBeenCalledWith(PROJECT_OWNER_ROLE_SLUG, [
				'credential:create',
			]);
			expect(roleService.removeScopesFromRole).not.toHaveBeenCalled();
			expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(
				SETTINGS_KEY,
				JSON.stringify([]),
				false,
				{},
			);
			expect(result.scopes).toContain('credential:create');
		});

		it('rejects a scope that is not a default scope of the role', async () => {
			await expect(
				service.updateRole(body([...defaultScopes, 'project:delete']), 'user-id'),
			).rejects.toThrow(BadRequestError);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
			expect(roleService.removeScopesFromRole).not.toHaveBeenCalled();
		});

		it('rejects removing any other default scope', async () => {
			await expect(
				service.updateRole(body(defaultScopes.filter((s) => s !== 'workflow:create')), 'user-id'),
			).rejects.toThrow(BadRequestError);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
			expect(roleService.removeScopesFromRole).not.toHaveBeenCalled();
		});

		it('rejects a changed display name', async () => {
			await expect(
				service.updateRole({ ...body(defaultScopes), displayName: 'Renamed' }, 'user-id'),
			).rejects.toThrow(BadRequestError);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});

		it('rejects a changed description', async () => {
			await expect(
				service.updateRole({ ...body(defaultScopes), description: 'Something else' }, 'user-id'),
			).rejects.toThrow(BadRequestError);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});

		it('leaves the role alone when the body carries no scopes', async () => {
			const result = await service.updateRole({ displayName: 'Project Owner' }, 'user-id');

			expect(result.scopes).toEqual(defaultScopes);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
			expect(roleService.removeScopesFromRole).not.toHaveBeenCalled();
		});
	});

	describe('run', () => {
		const storedRow = (value: string) => mock<Settings>({ key: SETTINGS_KEY, value });

		it('applies the stored choice', async () => {
			settingsRepository.findByKey.mockResolvedValue(
				storedRow(JSON.stringify(['credential:create'])),
			);

			await service.run();
			expect(roleService.removeScopesFromRole).toHaveBeenCalledWith(PROJECT_OWNER_ROLE_SLUG, [
				'credential:create',
			]);
		});

		it('skips when canvas-only mode is off', async () => {
			globalConfig.canvasOnly = false;
			settingsRepository.findByKey.mockResolvedValue(
				storedRow(JSON.stringify(['credential:create'])),
			);

			await service.run();
			expect(roleService.removeScopesFromRole).not.toHaveBeenCalled();
		});

		it('skips when no choice is stored', async () => {
			await service.run();
			expect(roleService.removeScopesFromRole).not.toHaveBeenCalled();
		});

		it('skips a malformed stored value', async () => {
			settingsRepository.findByKey.mockResolvedValue(storedRow('not json'));

			await service.run();
			expect(roleService.removeScopesFromRole).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalled();
		});

		it('ignores a stored scope that is no longer removable', async () => {
			settingsRepository.findByKey.mockResolvedValue(
				storedRow(JSON.stringify(['workflow:create'])),
			);

			await service.run();
			expect(roleService.removeScopesFromRole).not.toHaveBeenCalled();
		});
	});
});
