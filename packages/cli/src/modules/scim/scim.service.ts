import type {
	ScimRole,
	ScimUser,
	ScimUserCreateDto,
	ScimListResponse,
	ScimPatchRequestDto,
} from '@n8n/api-types';
import { SCIM_N8N_USER_SCHEMA, scimRoleValue } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { AuthProviderType, Role } from '@n8n/db';
import { RoleRepository, User, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { GLOBAL_MEMBER_ROLE_SLUG, GLOBAL_OWNER_ROLE_SLUG } from '@n8n/permissions';
import { randomString } from 'n8n-workflow';

import { EventService, UrlService } from '@n8n/backend-services';
import { PasswordUtility } from '@/services/password.utility';

import { ScimUserRepository } from './database/scim-user.repository';
import { ScimDeprovisioningService } from './scim-deprovisioning.service';
import {
	ScimConflictError,
	ScimForbiddenError,
	ScimInvalidFilterError,
	ScimInvalidValueError,
	ScimResourceNotFoundError,
} from './scim.errors';

/** Provider types whose auth identity carries the IdP's externalId. */
const SSO_PROVIDER_TYPES: AuthProviderType[] = ['saml', 'oidc'];

type ParsedFilter = { attribute: 'userName' | 'externalId'; value: string };

/** The user fields the owner guard compares before and after a write. */
type OwnerGuardSnapshot = Pick<User, 'email' | 'disabled'> & { roleSlug: string | undefined };

/** The PATCH path of the extension's instance role, `urn:...:User:instanceRole`. */
const INSTANCE_ROLE_PATH = `${SCIM_N8N_USER_SCHEMA}:instanceRole`;

@Service()
export class ScimService {
	constructor(
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly roleRepository: RoleRepository,
		private readonly scimUserRepository: ScimUserRepository,
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
		private readonly passwordUtility: PasswordUtility,
		private readonly eventService: EventService,
		private readonly scimDeprovisioningService: ScimDeprovisioningService,
	) {}

	/**
	 * Convert n8n User entity to SCIM User format.
	 * Expects the `authIdentities` relation to be loaded when the caller
	 * wants `externalId` to be populated.
	 */
	private toScimUser(user: User): ScimUser {
		const baseUrl = this.urlService.getInstanceBaseUrl();
		const externalId = user.authIdentities?.find((identity) =>
			SSO_PROVIDER_TYPES.includes(identity.providerType),
		)?.providerId;

		const roleSlug = user.role?.slug;
		const scimUser: ScimUser = {
			schemas: ['urn:ietf:params:scim:schemas:core:2.0:User', SCIM_N8N_USER_SCHEMA],
			id: user.id,
			userName: user.email,
			externalId,
			name: {
				givenName: user.firstName || undefined,
				familyName: user.lastName || undefined,
			},
			displayName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
			emails: user.email
				? [
						{
							value: user.email,
							primary: true,
						},
					]
				: undefined,
			active: !user.disabled,
			// The instance role, in both places a provider may read it.
			roles: roleSlug ? [{ value: roleSlug, primary: true }] : undefined,
			[SCIM_N8N_USER_SCHEMA]: roleSlug ? { instanceRole: roleSlug } : undefined,
			meta: {
				resourceType: 'User',
				created: user.createdAt.toISOString(),
				lastModified: user.updatedAt.toISOString(),
				location: `${baseUrl}/scim/v2/Users/${user.id}`,
			},
		};

		return scimUser;
	}

	/**
	 * Parse the supported subset of SCIM filter expressions.
	 * Supported: `userName eq "..."` and `externalId eq "..."`.
	 * Anything else raises `ScimInvalidFilterError`; silently ignoring a
	 * filter would make the IdP treat unrelated users as matches.
	 */
	private parseFilter(filter: string): ParsedFilter {
		const match = filter.match(/^\s*(userName|externalId)\s+eq\s+"([^"]+)"\s*$/i);
		if (!match) throw new ScimInvalidFilterError(filter);

		const attribute = match[1].toLowerCase() === 'username' ? 'userName' : 'externalId';
		return { attribute, value: match[2] };
	}

	/**
	 * Get all users with SCIM format
	 */
	async getUsers(options: {
		startIndex?: number;
		count?: number;
		filter?: string;
	}): Promise<ScimListResponse> {
		const { startIndex = 1, count = 100, filter } = options;

		const skip = Math.max(startIndex, 1) - 1;
		const take = Math.min(Math.max(count, 0), 1000);

		const parsed = filter ? this.parseFilter(filter) : undefined;
		const [users, totalResults] = await this.scimUserRepository.findPage(
			{
				skip,
				take,
				filter:
					parsed?.attribute === 'userName'
						? { attribute: 'userName', value: parsed.value }
						: parsed
							? {
									attribute: 'externalId',
									value: parsed.value,
									providerTypes: SSO_PROVIDER_TYPES,
								}
							: undefined,
			},
			{},
		);

		const scimUsers = users.map((user) => this.toScimUser(user));

		return {
			schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
			totalResults,
			startIndex,
			itemsPerPage: scimUsers.length,
			Resources: scimUsers,
		};
	}

	/** Number of users that SCIM created, and how many of them are deactivated. */
	async getProvisioningCounts(): Promise<{ provisioned: number; deactivated: number }> {
		return await this.scimUserRepository.countProvisioned({});
	}

	/**
	 * Get a single user by ID
	 */
	async getUserById(id: string): Promise<ScimUser | null> {
		const user = await this.userRepository.findOne({
			where: { id },
			relations: ['authIdentities', 'role'],
		});

		if (!user) return null;

		return this.toScimUser(user);
	}

	/**
	 * The address to use as the n8n email.
	 *
	 * SCIM's `userName` is only "a unique identifier for the user" (RFC 7643
	 * section 4.1.1), and providers commonly send a login name there, with the
	 * address in `emails`. n8n identifies people by email, so prefer the
	 * primary entry and fall back to `userName` for providers that do put an
	 * address there.
	 */
	private resolveEmail(scimUser: ScimUserCreateDto): string {
		const emails = scimUser.emails ?? [];
		const candidate =
			emails.find((entry) => entry.primary)?.value ?? emails[0]?.value ?? scimUser.userName;

		if (!candidate?.includes('@')) {
			throw new ScimInvalidValueError(
				`Cannot determine an email address for "${scimUser.userName}". Send it in "emails", or use an address as "userName".`,
			);
		}

		return candidate.toLowerCase();
	}

	/**
	 * The instance role a provider asks for, as a slug, or undefined when the
	 * request carries none. The n8n extension wins over the core `roles`
	 * attribute when a provider sends both.
	 */
	private requestedRoleSlug(scimUser: {
		roles?: ScimRole[];
		[SCIM_N8N_USER_SCHEMA]?: { instanceRole?: string };
	}): string | undefined {
		const fromExtension = scimUser[SCIM_N8N_USER_SCHEMA]?.instanceRole;
		if (fromExtension !== undefined) return fromExtension;

		const roles = scimUser.roles;
		if (!roles?.length) return undefined;
		if (roles.length > 1) {
			throw new ScimInvalidValueError(
				'n8n users have a single instance role; the roles attribute must contain exactly one entry',
			);
		}
		return scimRoleValue(roles[0]);
	}

	/**
	 * Resolve a requested slug to a global role. The owner role is never
	 * assignable, and an unknown slug is a 400 rather than a silent member, so
	 * a typo in the provider's mapping shows up at once.
	 */
	private async resolveRole(slug: string): Promise<Role> {
		if (slug === GLOBAL_OWNER_ROLE_SLUG) {
			throw new ScimInvalidValueError('The owner role cannot be assigned via SCIM');
		}
		const role = await this.roleRepository.findOne({ where: { slug, roleType: 'global' } });
		if (!role) {
			throw new ScimInvalidValueError(`Unknown instance role: ${slug}`);
		}
		return role;
	}

	/** Apply a requested instance role to a user entity, when it differs. */
	private async applyRole(user: User, slug: string | undefined, changes: Set<string>) {
		if (slug === undefined) return;
		const role = await this.resolveRole(slug);
		if (role.slug === user.role?.slug) return;
		user.role = role;
		changes.add('role');
	}

	/**
	 * Create a new user from SCIM data. The user gets the requested instance
	 * role, or `global:member` when the provider sends none, and a personal
	 * project, mirroring the SSO signup flows. A random unusable password is
	 * set so the user is not treated as "pending" — they are expected to sign
	 * in via SSO.
	 */
	async createUser(scimUser: ScimUserCreateDto): Promise<ScimUser> {
		const email = this.resolveEmail(scimUser);
		const firstName = scimUser.name?.givenName ?? '';
		const lastName = scimUser.name?.familyName ?? '';
		const active = scimUser.active ?? true;
		const externalId = scimUser.externalId;

		const existingUser = await this.userRepository.findOne({ where: { email } });
		if (existingUser) {
			throw new ScimConflictError('User with this userName already exists');
		}

		const requestedSlug = this.requestedRoleSlug(scimUser);
		const role = requestedSlug ? await this.resolveRole(requestedSlug) : undefined;
		const providerType = this.getSsoProviderType();

		const createdUser = await this.scimUserRepository.createProvisioned(
			{
				email,
				firstName,
				lastName,
				role: { slug: role?.slug ?? GLOBAL_MEMBER_ROLE_SLUG },
				// generates a password that is not used or known to the user
				password: await this.passwordUtility.hash(randomString(18)),
				disabled: !active,
			},
			// Link the IdP identity so SSO login matches the provisioned user
			providerType && externalId ? { providerId: externalId, providerType } : undefined,
			{},
		);

		this.logger.info('SCIM: User provisioned', { userId: createdUser.id });
		this.eventService.emit('user-signed-up', {
			user: createdUser,
			userType: providerType ?? 'email',
			wasDisabledLdapUser: false,
		});

		const created = await this.getUserById(createdUser.id);
		// The user was just created inside a committed transaction
		if (!created) throw new ScimResourceNotFoundError(createdUser.id);
		return created;
	}

	/**
	 * Update a user via SCIM PATCH operation.
	 * Supports `add`/`replace` operations for `active`, `userName`,
	 * `name.givenName`, `name.familyName`, work-email values and the instance
	 * role, both with explicit paths and with path-less object values (as
	 * sent by Entra ID).
	 */
	async patchUser(id: string, patchRequest: ScimPatchRequestDto): Promise<ScimUser> {
		const user = await this.getUserEntity(id);
		const before = this.snapshot(user);

		const changes = new Set<string>();
		// The role lookup is async, so the ops loop records the request and it is applied after.
		const pending: { roleSlug?: string } = {};

		for (const operation of patchRequest.Operations) {
			const { op, path, value } = operation;

			if (op !== 'add' && op !== 'replace') continue;

			if (path) {
				this.applyPathOperation(user, path, value, changes, pending);
			} else if (typeof value === 'object' && value !== null) {
				for (const [attribute, attributeValue] of Object.entries(value)) {
					this.applyPathOperation(user, attribute, attributeValue, changes, pending);
				}
			}
		}

		await this.applyRole(user, pending.roleSlug, changes);
		this.assertOwnerUnchanged(user, before);

		if (changes.size > 0) {
			await this.saveUser(user);
			this.eventService.emit('user-updated', { user, fieldsChanged: [...changes] });
		}

		const patched = await this.getUserById(user.id);
		if (!patched) throw new ScimResourceNotFoundError(user.id);
		return patched;
	}

	/**
	 * Apply a single SCIM attribute change to the user entity.
	 * Unknown attributes are ignored, per RFC 7644 the server only applies
	 * the attributes it understands.
	 */
	private applyPathOperation(
		user: User,
		path: string,
		value: unknown,
		changes: Set<string>,
		pending: { roleSlug?: string },
	) {
		switch (path) {
			case 'roles':
				if (Array.isArray(value)) {
					pending.roleSlug = this.requestedRoleSlug({ roles: this.toScimRoles(value) });
				}
				return;
			case INSTANCE_ROLE_PATH:
				if (typeof value === 'string') pending.roleSlug = value;
				return;
			case SCIM_N8N_USER_SCHEMA:
				if (typeof value === 'object' && value !== null) {
					const extension = value as { instanceRole?: unknown };
					if (typeof extension.instanceRole === 'string') {
						pending.roleSlug = extension.instanceRole;
					}
				}
				return;
			case 'active':
				if (typeof value === 'boolean') {
					user.disabled = !value;
					changes.add('disabled');
				}
				return;
			case 'userName':
				if (typeof value === 'string') {
					user.email = value.toLowerCase();
					changes.add('email');
				}
				return;
			case 'name.givenName':
				if (typeof value === 'string') {
					user.firstName = value;
					changes.add('firstName');
				}
				return;
			case 'name.familyName':
				if (typeof value === 'string') {
					user.lastName = value;
					changes.add('lastName');
				}
				return;
			case 'name':
				if (typeof value === 'object' && value !== null) {
					const name = value as { givenName?: unknown; familyName?: unknown };
					if (typeof name.givenName === 'string') {
						user.firstName = name.givenName;
						changes.add('firstName');
					}
					if (typeof name.familyName === 'string') {
						user.lastName = name.familyName;
						changes.add('lastName');
					}
				}
				return;
			case 'emails':
				if (Array.isArray(value)) {
					const primary = value.find(
						(email: { primary?: boolean; value?: unknown }) =>
							email?.primary && typeof email.value === 'string',
					) as { value: string } | undefined;
					if (primary) {
						user.email = primary.value.toLowerCase();
						changes.add('email');
					}
				}
				return;
			default:
				// e.g. Okta sends `emails[type eq "work"].value`
				if (/^emails\[.*\]\.value$/.test(path) && typeof value === 'string') {
					user.email = value.toLowerCase();
					changes.add('email');
				}
		}
	}

	/** Narrow an unknown PATCH value to the SCIM roles shape. Malformed entries are dropped. */
	private toScimRoles(value: unknown[]): ScimRole[] {
		return value.filter(
			(role): role is ScimRole =>
				typeof role === 'string' ||
				(typeof role === 'object' &&
					role !== null &&
					typeof (role as { value?: unknown }).value === 'string'),
		);
	}

	/**
	 * Update a user via SCIM PUT operation
	 */
	async updateUser(id: string, scimUser: ScimUserCreateDto): Promise<ScimUser> {
		const user = await this.getUserEntity(id);
		const before = this.snapshot(user);

		const changes = new Set<string>();

		const email = this.resolveEmail(scimUser);
		if (email !== user.email) {
			user.email = email;
			changes.add('email');
		}
		if (scimUser.name?.givenName !== undefined && scimUser.name.givenName !== user.firstName) {
			user.firstName = scimUser.name.givenName;
			changes.add('firstName');
		}
		if (scimUser.name?.familyName !== undefined && scimUser.name.familyName !== user.lastName) {
			user.lastName = scimUser.name.familyName;
			changes.add('lastName');
		}
		if (scimUser.active !== undefined && scimUser.active === user.disabled) {
			user.disabled = !scimUser.active;
			changes.add('disabled');
		}
		await this.applyRole(user, this.requestedRoleSlug(scimUser), changes);

		this.assertOwnerUnchanged(user, before);

		if (changes.size > 0) {
			await this.saveUser(user);
			this.eventService.emit('user-updated', { user, fieldsChanged: [...changes] });
		}

		const updated = await this.getUserById(user.id);
		if (!updated) throw new ScimResourceNotFoundError(user.id);
		return updated;
	}

	/**
	 * Apply the deprovisioning policy to a SCIM DELETE.
	 *
	 * `disable` (the default) deactivates the user, which ends their sessions
	 * and API keys at once. Their workflows and credentials are kept, so an
	 * admin can transfer the ownership later.
	 *
	 * `delete` deletes the user, and transfers or deletes their work.
	 */
	async deleteUser(id: string): Promise<void> {
		const user = await this.getUserEntity(id);
		const policy = await this.scimDeprovisioningService.getPolicy();

		if (policy.onDelete === 'delete') {
			await this.scimDeprovisioningService.deleteUser(user, policy);
			return;
		}

		if (this.isOwner(user)) {
			throw new ScimForbiddenError('The instance owner cannot be deleted via SCIM');
		}

		user.disabled = true;
		await this.userRepository.save(user);
		this.eventService.emit('user-updated', { user, fieldsChanged: ['disabled'] });
		this.logger.info('SCIM: User deprovisioned', { userId: user.id });
	}

	private async getUserEntity(id: string): Promise<User> {
		const user = await this.userRepository.findOne({ where: { id }, relations: ['role'] });
		if (!user) throw new ScimResourceNotFoundError(id);
		return user;
	}

	private isOwner(user: User): boolean {
		return user.role?.slug === GLOBAL_OWNER_ROLE_SLUG;
	}

	private snapshot(user: User): OwnerGuardSnapshot {
		return { email: user.email, disabled: user.disabled, roleSlug: user.role?.slug };
	}

	/**
	 * The owner is the account of last resort for the instance. An IdP must
	 * not take it over through its email or lock it out, so reject the whole
	 * request. Other attributes, such as the name, can still change.
	 */
	private assertOwnerUnchanged(user: User, before: OwnerGuardSnapshot): void {
		if (before.roleSlug === GLOBAL_OWNER_ROLE_SLUG && !this.isOwner(user)) {
			throw new ScimForbiddenError('The role of the instance owner cannot be changed via SCIM');
		}

		if (!this.isOwner(user)) return;

		// A difference in case only is the same address, so allow it.
		if (user.email.toLowerCase() !== before.email.toLowerCase()) {
			throw new ScimForbiddenError('The email of the instance owner cannot be changed via SCIM');
		}

		if (user.disabled && !before.disabled) {
			throw new ScimForbiddenError('The instance owner cannot be deactivated via SCIM');
		}
	}

	/**
	 * Persist user changes, translating unique-constraint violations on
	 * email into a SCIM uniqueness conflict.
	 */
	private async saveUser(user: User): Promise<void> {
		const conflictingUser = await this.userRepository.findOne({ where: { email: user.email } });
		if (conflictingUser && conflictingUser.id !== user.id) {
			throw new ScimConflictError('User with this userName already exists');
		}
		await this.userRepository.save(user);
	}

	private getSsoProviderType(): Extract<AuthProviderType, 'saml' | 'oidc'> | null {
		if (this.globalConfig.sso.oidc.loginEnabled) return 'oidc';
		if (this.globalConfig.sso.saml.loginEnabled) return 'saml';
		return null;
	}
}
