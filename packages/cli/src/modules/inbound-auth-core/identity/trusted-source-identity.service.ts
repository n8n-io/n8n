import { BLOCK_ACCESS_ASSIGNMENT } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService, RoleService } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
import {
	isValidEmail,
	type OperationContext,
	principalFromUser,
	TransactionRunner,
	type User,
	UserRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';
import {
	type ExternalIdentity,
	IdentityService,
	type Result,
	type TrustedSource,
	type Verified,
} from '@n8n/inbound-auth';
import { GLOBAL_OWNER_ROLE_SLUG, type Principal, type SecurityContext } from '@n8n/permissions';
import { UnexpectedError } from 'n8n-workflow';

import { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import type { ResolvedRoles } from '@/modules/provisioning.ee/role-resolver-types';
import { RoleResolverService } from '@/modules/provisioning.ee/role-resolver.service.ee';

import type { TrustedSourceIdentityEntity } from '../database/entities/trusted-source-identity.entity';
import {
	type InsertTrustedSourceIdentityRow,
	TrustedSourceIdentityRepository,
} from '../database/repositories/trusted-source-identity.repository';
import { translateClaims } from './external-identity';

// Stamp at most once a day so a busy caller does not write on every request.
function isStale(lastSeenAt: Date | null): boolean {
	return lastSeenAt === null || Date.now() - lastSeenAt.getTime() > Time.days.toMilliseconds;
}

// A null password makes `User.computeIsPending` report a JIT user as pending, because it has no `AuthIdentity` row.
// The placeholder is not a bcrypt hash, so it never matches a login.
const PLACEHOLDER_PASSWORD = '!trusted-source-no-password';
// Matches the `firstName`/`lastName` column length on `User`.
const MAX_NAME_LENGTH = 32;

/**
 * A resolved principal plus the work to run once the transaction committed.
 * `onCommit` returns a principal when the work changed the role the transaction read.
 */
type Resolved = Result<{
	principal: Principal;
	onCommit?: () => Promise<Principal | undefined>;
}>;

function buildContext(
	verified: Verified,
	external: ExternalIdentity,
	subject: Principal,
	actor?: Principal,
): SecurityContext {
	return {
		...(actor ? { actor } : {}),
		subject,
		authMethod: 'oauth-access-token',
		subjectClaim: {
			sourceId: verified.source.id,
			issuer: verified.source.issuer,
			subject: external.subject,
		},
		clientId: external.clientId,
		tokenScopes: external.scopes,
		resource: verified.resource,
		grant: verified.grant,
		assurance: external.assurance,
	};
}

type MappedRoles = {
	instanceRole: string;
	projectRoles: { projectId: string; role: string }[];
	resolved: ResolvedRoles;
	managed: { instanceRole: boolean; projectRoles: boolean };
};

/** Resolves the verified caller to an n8n user through the trusted-source binding table. */
@Service()
export class TrustedSourceIdentityService extends IdentityService {
	constructor(
		private readonly logger: Logger,
		private readonly identities: TrustedSourceIdentityRepository,
		private readonly users: UserRepository,
		private readonly txRunner: TransactionRunner,
		private readonly eventService: EventService,
		private readonly roleService: RoleService,
		private readonly roleResolver: RoleResolverService,
		private readonly provisioning: ProvisioningService,
	) {
		super();
	}

	private async mapRoles(
		source: TrustedSource,
		claims: Readonly<Record<string, unknown>>,
	): Promise<Result<MappedRoles | undefined>> {
		const { mode, instanceRoleRules, projectRoleRules, fallbackInstanceRole } =
			source.config.identity.roleMapping;

		if (mode === 'off') return { ok: true, value: undefined };

		const resolved = await this.roleResolver.resolveRoles(
			{ instanceRoleRules, projectRoleRules, fallbackInstanceRole: fallbackInstanceRole ?? '' },
			{
				$claims: claims,
				// `oauth2` labels the trusted-source protocol, so SSO rules copy over unchanged.
				$provider: 'oauth2',
			},
		);

		const instanceRole = resolved.instanceRole.role;

		if (
			instanceRole === BLOCK_ACCESS_ASSIGNMENT ||
			!(await this.isAssignableInstanceRole(instanceRole, {}))
		) {
			return { ok: false, reason: 'no-role' };
		}

		const projectRoles = [...resolved.projectRoles.values()].map(({ projectId, role }) => ({
			projectId,
			role,
		}));

		if (projectRoles.length > 0) {
			try {
				await this.roleService.checkRolesExist(
					projectRoles.map(({ role }) => role),
					'project',
				);
			} catch (error) {
				if (error instanceof BadRequestError) return { ok: false, reason: 'no-role' };
				throw error;
			}
		}

		return {
			ok: true,
			value: {
				instanceRole,
				projectRoles,
				resolved,
				managed: {
					instanceRole: instanceRoleRules.some((rule) => rule.enabled),
					projectRoles: projectRoleRules.some((rule) => rule.enabled),
				},
			},
		};
	}

	private async resolveByUserId(id: string): Promise<Result<Principal>> {
		const user = await this.users.findByIdWithRole(id);
		if (user === null) return { ok: false, reason: 'unknown-subject' };
		if (user.disabled) return { ok: false, reason: 'user-disabled' };
		return { ok: true, value: principalFromUser(user) };
	}

	private async acceptBinding(
		source: TrustedSource,
		binding: TrustedSourceIdentityEntity,
		mappedRoles: MappedRoles | undefined,
		ctx: OperationContext,
	): Promise<Resolved> {
		if (binding.status !== 'active') return { ok: false, reason: 'binding-inactive' };
		if (binding.user.disabled) return { ok: false, reason: 'user-disabled' };

		if (isStale(binding.lastSeenAt)) {
			await this.identities.touchLastSeen(binding.sourceId, binding.subject, new Date(), ctx);
		}

		const continuous =
			source.config.identity.roleMapping.mode === 'continuous' &&
			mappedRoles !== undefined &&
			binding.provenance === 'jit' &&
			binding.user.role.slug !== GLOBAL_OWNER_ROLE_SLUG;

		return {
			ok: true,
			value: {
				principal: principalFromUser(binding.user),
				// Role writes run after the commit, because `changeUserRole` opens its own transaction.
				...(continuous && {
					onCommit: async () => {
						await this.provisioning.applyResolvedRoles(
							binding.user,
							mappedRoles.resolved,
							mappedRoles.managed,
						);
						// The request that changed the role must run with the new role, so re-read it.
						if (
							!mappedRoles.managed.instanceRole ||
							binding.user.role.slug === mappedRoles.instanceRole
						)
							return;
						const user = await this.users.findByIdWithRole(binding.user.id);
						return user === null ? undefined : principalFromUser(user);
					},
				}),
			},
		};
	}

	private async link(
		source: TrustedSource,
		external: ExternalIdentity,
		user: User,
		mappedRoles: MappedRoles | undefined,
		ctx: OperationContext,
	): Promise<Resolved> {
		const row: InsertTrustedSourceIdentityRow = {
			sourceId: source.id,
			subject: external.subject,
			userId: user.id,
			provenance: 'claim-match',
			status: 'active',
		};
		await this.identities.insertIfAbsent(row, ctx);

		const binding = await this.identities.findBySubject(source.id, external.subject, ctx);
		if (binding === null) throw new UnexpectedError('Binding missing after insert');

		const accepted = await this.acceptBinding(source, binding, mappedRoles, ctx);

		if (accepted.ok && binding.user.id === user.id) {
			return {
				ok: true,
				value: {
					principal: accepted.value.principal,
					onCommit: async () => {
						const refreshed = await accepted.value.onCommit?.();
						this.eventService.emit('trusted-source-identity-linked', {
							userId: user.id,
							sourceId: source.id,
							subject: external.subject,
							issuer: source.issuer,
							provenance: 'claim-match',
						});
						return refreshed;
					},
				},
			};
		}
		return accepted;
	}

	private async provision(
		source: TrustedSource,
		external: ExternalIdentity,
		mappedRoles: MappedRoles | undefined,
		ctx: OperationContext,
	): Promise<Resolved> {
		const { provision } = source.config.identity;

		if (provision.human === 'off') return { ok: false, reason: 'provision-refused' };

		const email = external.email;

		if (email === undefined || !isValidEmail(email))
			return { ok: false, reason: 'provision-refused' };

		// The config schema rejects jit provisioning without a role-mapping mode. This guards the type only.
		if (mappedRoles === undefined) return { ok: false, reason: 'no-role' };

		const role = mappedRoles.instanceRole;

		const [firstName = '', ...rest] = (external.displayName ?? '').trim().split(/\s+/);

		const user = await this.identities.createUserWithBinding(
			ctx,
			{
				email,
				firstName: firstName.slice(0, MAX_NAME_LENGTH),
				lastName: rest.join(' ').slice(0, MAX_NAME_LENGTH),
				role: {
					slug: role,
				},
				password: PLACEHOLDER_PASSWORD,
			},
			{
				sourceId: source.id,
				subject: external.subject,
				provenance: 'jit',
				status: 'active',
			},
			mappedRoles.projectRoles,
		);

		return {
			ok: true,
			value: {
				principal: principalFromUser(user),
				onCommit: async () => {
					this.eventService.emit('trusted-source-user-provisioned', {
						userId: user.id,
						sourceId: source.id,
						subject: external.subject,
						issuer: source.issuer,
						role,
					});
					return undefined;
				},
			},
		};
	}

	private async isAssignableInstanceRole(slug: string, ctx: OperationContext): Promise<boolean> {
		if (slug === GLOBAL_OWNER_ROLE_SLUG) return false;
		if (!(await this.identities.globalRoleExists(slug, ctx))) return false;
		return this.roleService.isRoleLicensed(slug);
	}

	private async linkOrProvision(
		source: TrustedSource,
		external: ExternalIdentity,
		mappedRoles: MappedRoles | undefined,
		ctx: OperationContext,
	): Promise<Resolved> {
		const { linkByEmail } = source.config.identity;

		if (linkByEmail === 'off') return { ok: false, reason: 'link-refused' };

		const email = external.email;
		const mayLookUp =
			linkByEmail === 'any' || (linkByEmail === 'verified-only' && external.emailVerified === true);

		if (mayLookUp && email !== undefined) {
			const user = await this.identities.findUserByEmail(email, ctx);
			if (user !== null) {
				if (user.disabled) return { ok: false, reason: 'user-disabled' };
				if (user.role.slug === GLOBAL_OWNER_ROLE_SLUG) return { ok: false, reason: 'link-refused' };

				return await this.link(source, external, user, mappedRoles, ctx);
			}
		}
		return await this.provision(source, external, mappedRoles, ctx);
	}

	private async resolveBinding(
		source: TrustedSource,
		external: ExternalIdentity,
	): Promise<Result<Principal>> {
		// Runs before the transaction. The resolver and the role checks read without a context, and the pool may hold one connection.
		const mapped = await this.mapRoles(source, external.raw);
		if (!mapped.ok) return mapped;

		const result = await this.txRunner.run({}, async (ctx) => {
			const binding = await this.identities.findBySubject(source.id, external.subject, ctx);
			if (binding !== null) return await this.acceptBinding(source, binding, mapped.value, ctx);
			return await this.linkOrProvision(source, external, mapped.value, ctx);
		});
		if (result.ok) {
			const refreshed = await result.value.onCommit?.();
			return { ok: true, value: refreshed ?? result.value.principal };
		}

		return result;
	}

	async identify(verified: Verified): Promise<Result<SecurityContext>> {
		const { source } = verified;
		const identity = source.config.identity;

		const translated = translateClaims(verified.claims, identity.claimMapping, this.logger);

		if (!translated.ok) return translated;

		const externalIdentity = translated.value;

		const resolved =
			identity.subject === 'n8n-user-id'
				? await this.resolveByUserId(externalIdentity.subject)
				: await this.resolveBinding(source, externalIdentity);

		if (!resolved.ok) return resolved;

		return {
			ok: true,
			value: buildContext(verified, externalIdentity, resolved.value),
		};
	}
}
