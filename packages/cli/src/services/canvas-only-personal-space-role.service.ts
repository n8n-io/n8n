import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { Role as RoleDTO } from '@n8n/permissions';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { Telemetry } from '@/telemetry';

import { RoleService } from './role.service';

/**
 * The scopes an admin can take away from the personal space role. Every other
 * scope of that role, and its name and description, stay fixed.
 */
const REMOVABLE_SCOPES = ['credential:create', 'dataTable:create', 'agent:create'];

/** Holds the scopes an admin removed, as a JSON array of scope slugs. */
const SETTINGS_KEY = 'canvasOnly.personalSpaceRoleRemovedScopes';

type RoleUpdate = { displayName?: string; description?: string | null; scopes?: string[] };

/**
 * Lets an admin take some scopes away from the personal space role, which every
 * user holds in their own personal project. Only for canvas-only mode, where the
 * instance builds its own experience around n8n and needs to limit what a user
 * can do in their personal project.
 *
 * The whole capability lives here: the rule, the update, the stored state and the
 * report. Everything else treats the personal space role as a fixed system role.
 */
@Service()
export class CanvasOnlyPersonalSpaceRoleService {
	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly roleService: RoleService,
		private readonly settingsRepository: SettingsRepository,
		private readonly telemetry: Telemetry,
		private readonly logger: Logger,
	) {}

	/** Whether this service, and not the custom role path, handles the role. */
	isActiveFor(roleSlug: string): boolean {
		return this.globalConfig.canvasOnly && roleSlug === PROJECT_OWNER_ROLE_SLUG;
	}

	/**
	 * Applies the scopes of a role update, and stores which scopes the admin
	 * removed, so the next start can apply the same choice again.
	 */
	async updateRole(newRole: RoleUpdate): Promise<RoleDTO> {
		const role = await this.roleService.getRole(PROJECT_OWNER_ROLE_SLUG);

		// Omitted fields count as unchanged, so a partial update body stays usable.
		if (newRole.displayName !== undefined && newRole.displayName !== role.displayName) {
			throw new BadRequestError('Cannot change the name of the personal space role');
		}
		if (newRole.description !== undefined && newRole.description !== role.description) {
			throw new BadRequestError('Cannot change the description of the personal space role');
		}
		if (newRole.scopes === undefined) {
			return role;
		}

		const requested = new Set(newRole.scopes);
		const defaults = new Set([...role.scopes, ...REMOVABLE_SCOPES]);

		const rejected = newRole.scopes.filter((slug) => !defaults.has(slug));
		if (rejected.length > 0) {
			throw new BadRequestError(
				`The following scopes are not allowed for the personal space role: ${rejected.join(', ')}`,
			);
		}

		const missing = [...defaults].filter(
			(slug) => !requested.has(slug) && !REMOVABLE_SCOPES.includes(slug),
		);
		if (missing.length > 0) {
			throw new BadRequestError(
				`The following scopes cannot be removed from the personal space role: ${missing.join(', ')}`,
			);
		}

		const removedScopes = REMOVABLE_SCOPES.filter((slug) => !requested.has(slug));
		await this.storeRemovedScopes(removedScopes);
		await this.applyRemovedScopes(removedScopes);

		const updatedRole = await this.roleService.getRole(PROJECT_OWNER_ROLE_SLUG);

		this.telemetry.track(TELEMETRY_EVENT.ROLES.USER_UPDATED_PERSONAL_SPACE_ROLE, {});

		return updatedRole;
	}

	/**
	 * Applies the stored choice at start-up, after the role sync. The sync gives
	 * every system role its default scopes on each start, so without this the
	 * removed scopes would come back. Canvas-only mode off leaves the defaults.
	 */
	async run(): Promise<void> {
		if (!this.globalConfig.canvasOnly) return;

		const removedScopes = await this.readRemovedScopes();
		if (removedScopes.length === 0) return;

		await this.applyRemovedScopes(removedScopes);
		this.logger.debug('Canvas-only personal space role init complete');
	}

	/** Takes the removed scopes off the role, and puts the others back. */
	private async applyRemovedScopes(removedScopes: string[]): Promise<void> {
		const keptScopes = REMOVABLE_SCOPES.filter((slug) => !removedScopes.includes(slug));

		if (removedScopes.length > 0) {
			await this.roleService.removeScopesFromRole(PROJECT_OWNER_ROLE_SLUG, removedScopes);
		}
		if (keptScopes.length > 0) {
			await this.roleService.addScopesToRole(PROJECT_OWNER_ROLE_SLUG, keptScopes);
		}
	}

	private async storeRemovedScopes(removedScopes: string[]): Promise<void> {
		await this.settingsRepository.upsertByKey(
			SETTINGS_KEY,
			JSON.stringify(removedScopes),
			false,
			{},
		);
	}

	private async readRemovedScopes(): Promise<string[]> {
		const row = await this.settingsRepository.findByKey(SETTINGS_KEY);
		if (!row) return [];

		try {
			const stored: unknown = JSON.parse(row.value);
			if (!Array.isArray(stored)) return [];
			return REMOVABLE_SCOPES.filter((slug) => stored.includes(slug));
		} catch {
			this.logger.warn(`Ignoring malformed setting "${SETTINGS_KEY}": ${row.value}`);
			return [];
		}
	}
}
