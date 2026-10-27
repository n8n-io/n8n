import type {
	ScimUser,
	ScimUserCreateDto,
	ScimListResponse,
	ScimPatchRequestDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { AuthProviderType, Person } from '@n8n/db';
import { PersonRepository, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { GLOBAL_MEMBER_ROLE_SLUG, GLOBAL_OWNER_ROLE_SLUG } from '@n8n/permissions';
import { randomString } from 'n8n-workflow';

import { EventService, UrlService } from '@n8n/backend-services';
import { PasswordUtility } from '@/services/password.utility';

import { ScimUserRepository } from './database/scim-user.repository';
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
type OwnerGuardSnapshot = Pick<Person, 'email' | 'disabled'>;

@Service()
export class ScimService {
	constructor(
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly scimUserRepository: ScimUserRepository,
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
		private readonly passwordUtility: PasswordUtility,
		private readonly eventService: EventService,
		private readonly personRepository: PersonRepository,
	) {}

	/**
	 * Convert n8n User entity to SCIM User format.
	 * Expects the `authIdentities` relation to be loaded when the caller
	 * wants `externalId` to be populated.
	 */
	private toScimUser(person: Person): ScimUser {
		const baseUrl = this.urlService.getInstanceBaseUrl();
		const externalId = person.authIdentities?.find((identity) =>
			SSO_PROVIDER_TYPES.includes(identity.providerType),
		)?.providerId;

		const scimUser: ScimUser = {
			schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
			id: person.id,
			userName: person.email,
			externalId,
			name: {
				givenName: person.firstName || undefined,
				familyName: person.lastName || undefined,
			},
			displayName: [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email,
			emails: person.email
				? [
						{
							value: person.email,
							primary: true,
						},
					]
				: undefined,
			active: !person.disabled,
			meta: {
				resourceType: 'User',
				created: person.createdAt.toISOString(),
				lastModified: person.updatedAt.toISOString(),
				location: `${baseUrl}/scim/v2/Users/${person.id}`,
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
		const [people, totalResults] = await this.scimUserRepository.findPage(
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

		const scimUsers = people.map((person) => this.toScimUser(person));

		return {
			schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
			totalResults,
			startIndex,
			itemsPerPage: scimUsers.length,
			Resources: scimUsers,
		};
	}

	/**
	 * Get a single user by ID
	 */
	async getUserById(id: string): Promise<ScimUser | null> {
		const person = await this.personRepository.findByIdWithAuthIdentities(id);

		if (!person) return null;

		return this.toScimUser(person);
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
	 * Create a new user from SCIM data. The user gets the `global:member`
	 * role and a personal project, mirroring the SSO signup flows. SCIM does
	 * not set roles: SSO role mapping or an admin does. A random unusable
	 * password is set so the user is not treated as "pending" — they are
	 * expected to sign in via SSO.
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

		const providerType = this.getSsoProviderType();

		const createdUser = await this.scimUserRepository.createProvisioned(
			{
				email,
				firstName,
				lastName,
				role: { slug: GLOBAL_MEMBER_ROLE_SLUG },
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
	 * `name.givenName`, `name.familyName` and work-email values, both with
	 * explicit paths and with path-less object values (as sent by Entra ID).
	 */
	async patchUser(id: string, patchRequest: ScimPatchRequestDto): Promise<ScimUser> {
		const person = await this.getUserEntity(id);
		const before = this.snapshot(person);

		const changes = new Set<string>();

		for (const operation of patchRequest.Operations) {
			const { op, path, value } = operation;

			if (op !== 'add' && op !== 'replace') continue;

			if (path) {
				this.applyPathOperation(person, path, value, changes);
			} else if (typeof value === 'object' && value !== null) {
				for (const [attribute, attributeValue] of Object.entries(value)) {
					this.applyPathOperation(person, attribute, attributeValue, changes);
				}
			}
		}

		this.assertOwnerUnchanged(person, before);

		if (changes.size > 0) {
			await this.saveUser(person);
			this.eventService.emit('user-updated', { user: person, fieldsChanged: [...changes] });
		}

		const patched = await this.getUserById(person.id);
		if (!patched) throw new ScimResourceNotFoundError(person.id);
		return patched;
	}

	/**
	 * Apply a single SCIM attribute change to the user entity.
	 * Unknown attributes are ignored, per RFC 7644 the server only applies
	 * the attributes it understands.
	 */
	private applyPathOperation(person: Person, path: string, value: unknown, changes: Set<string>) {
		switch (path) {
			case 'roles':
				// SSO role mapping owns the instance role, so SCIM roles are ignored.
				return;
			case 'active':
				if (typeof value === 'boolean') this.setField(person, 'disabled', !value, changes);
				return;
			case 'userName':
				if (typeof value === 'string') this.setField(person, 'email', value.toLowerCase(), changes);
				return;
			case 'name.givenName':
				if (typeof value === 'string') this.setField(person, 'firstName', value, changes);
				return;
			case 'name.familyName':
				if (typeof value === 'string') this.setField(person, 'lastName', value, changes);
				return;
			case 'name':
				if (typeof value === 'object' && value !== null) {
					const name = value as { givenName?: unknown; familyName?: unknown };
					if (typeof name.givenName === 'string') {
						this.setField(person, 'firstName', name.givenName, changes);
					}
					if (typeof name.familyName === 'string') {
						this.setField(person, 'lastName', name.familyName, changes);
					}
				}
				return;
			case 'emails':
				if (Array.isArray(value)) {
					const primary = value.find(
						(email: { primary?: boolean; value?: unknown }) =>
							email?.primary && typeof email.value === 'string',
					) as { value: string } | undefined;
					if (primary) this.setField(person, 'email', primary.value.toLowerCase(), changes);
				}
				return;
			default:
				// e.g. Okta sends `emails[type eq "work"].value`
				if (/^emails\[.*\]\.value$/.test(path) && typeof value === 'string') {
					this.setField(person, 'email', value.toLowerCase(), changes);
				}
		}
	}

	/**
	 * Set a field and record the change only when the value is different, so
	 * a PATCH that repeats the stored state writes nothing and emits no event.
	 */
	private setField<K extends 'email' | 'firstName' | 'lastName' | 'disabled'>(
		person: Person,
		field: K,
		value: Person[K],
		changes: Set<string>,
	) {
		if (person[field] === value) return;
		person[field] = value;
		changes.add(field);
	}

	/**
	 * Update a user via SCIM PUT operation
	 */
	async updateUser(id: string, scimUser: ScimUserCreateDto): Promise<ScimUser> {
		const person = await this.getUserEntity(id);
		const before = this.snapshot(person);

		const changes = new Set<string>();

		const email = this.resolveEmail(scimUser);
		if (email !== person.email) {
			person.email = email;
			changes.add('email');
		}
		if (scimUser.name?.givenName !== undefined && scimUser.name.givenName !== person.firstName) {
			person.firstName = scimUser.name.givenName;
			changes.add('firstName');
		}
		if (scimUser.name?.familyName !== undefined && scimUser.name.familyName !== person.lastName) {
			person.lastName = scimUser.name.familyName;
			changes.add('lastName');
		}
		if (scimUser.active !== undefined && scimUser.active === person.disabled) {
			person.disabled = !scimUser.active;
			changes.add('disabled');
		}

		this.assertOwnerUnchanged(person, before);

		if (changes.size > 0) {
			await this.saveUser(person);
			this.eventService.emit('user-updated', { user: person, fieldsChanged: [...changes] });
		}

		const updated = await this.getUserById(person.id);
		if (!updated) throw new ScimResourceNotFoundError(person.id);
		return updated;
	}

	/**
	 * Deactivate a user. n8n deliberately soft-deletes on SCIM DELETE:
	 * the user is disabled (which immediately invalidates their sessions
	 * and API keys) but their workflows and credentials are kept, so
	 * ownership can be transferred by an admin afterwards.
	 */
	async deleteUser(id: string): Promise<void> {
		const person = await this.getUserEntity(id);

		if (this.isOwner(person)) {
			throw new ScimForbiddenError('The instance owner cannot be deleted via SCIM');
		}

		person.disabled = true;
		await this.personRepository.save(person);
		this.eventService.emit('user-updated', { user: person, fieldsChanged: ['disabled'] });
		this.logger.info('SCIM: User deprovisioned', { userId: person.id });
	}

	/** SCIM manages people only. A service account id is not found. */
	private async getUserEntity(id: string): Promise<Person> {
		const person = await this.personRepository.findByIdWithRole(id);
		if (!person) throw new ScimResourceNotFoundError(id);
		return person;
	}

	private isOwner(person: Person): boolean {
		return person.role?.slug === GLOBAL_OWNER_ROLE_SLUG;
	}

	private snapshot(person: Person): OwnerGuardSnapshot {
		return { email: person.email, disabled: person.disabled };
	}

	/**
	 * The owner is the account of last resort for the instance. An IdP must
	 * not take it over through its email or lock it out, so reject the whole
	 * request. Other attributes, such as the name, can still change.
	 */
	private assertOwnerUnchanged(person: Person, before: OwnerGuardSnapshot): void {
		if (!this.isOwner(person)) return;

		// A difference in case only is the same address, so allow it.
		if (person.email.toLowerCase() !== before.email.toLowerCase()) {
			throw new ScimForbiddenError('The email of the instance owner cannot be changed via SCIM');
		}

		if (person.disabled && !before.disabled) {
			throw new ScimForbiddenError('The instance owner cannot be deactivated via SCIM');
		}
	}

	/**
	 * Persist user changes, translating unique-constraint violations on
	 * email into a SCIM uniqueness conflict.
	 */
	private async saveUser(person: Person): Promise<void> {
		// The email is unique across accounts of both kinds.
		const conflictingUser = await this.userRepository.findOne({ where: { email: person.email } });
		if (conflictingUser && conflictingUser.id !== person.id) {
			throw new ScimConflictError('User with this userName already exists');
		}
		await this.personRepository.save(person);
	}

	private getSsoProviderType(): Extract<AuthProviderType, 'saml' | 'oidc'> | null {
		if (this.globalConfig.sso.oidc.loginEnabled) return 'oidc';
		if (this.globalConfig.sso.saml.loginEnabled) return 'saml';
		return null;
	}
}
