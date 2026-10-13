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
import {
	type ExternalIdentity,
	IdentityService,
	type Result,
	type TrustedSource,
	type Verified,
} from '@n8n/inbound-auth';
import { GLOBAL_OWNER_ROLE_SLUG, type Principal, type SecurityContext } from '@n8n/permissions';
import { UnexpectedError } from 'n8n-workflow';

import {
	RoleMappingProxyService,
	type ResolvedRoles,
	type RoleMappingProvider,
} from '@/services/role-mapping-proxy.service';

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
	provider: RoleMappingProvider;
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
		private readonly roleMapping: RoleMappingProxyService,
	) {
		super();
	}

	// Runs inside the identity transaction: every read carries the context, because the pool may hold one connection.
	private async mapRoles(
		source: TrustedSource,
		claims: Readonly<Record<string, unknown>>,
		ctx: OperationContext,
	): Promise<Result<MappedRoles>> {
		// No provider means the provisioning module did not load, for example because it is not licensed.
		const provider = this.roleMapping.getProvider();
		if (provider === null) return { ok: false, reason: 'no-role' };

		const { instanceRoleRules, projectRoleRules, fallbackInstanceRole } =
			source.config.identity.roleMapping;

		const resolved = await provider.resolveRoles(
			{ instanceRoleRules, projectRoleRules, fallbackInstanceRole: fallbackInstanceRole ?? '' },
			{
				$claims: claims,
				// `oauth2` labels the trusted-source protocol, so SSO rules copy over unchanged.
				$provider: 'oauth2',
			},
			ctx,
		);

		const instanceRole = resolved.instanceRole.role;

		if (
			instanceRole === BLOCK_ACCESS_ASSIGNMENT ||
			!(await this.isAssignableInstanceRole(instanceRole, ctx))
		) {
			return { ok: false, reason: 'no-role' };
		}

		const projectRoles = [...resolved.projectRoles.values()].map(({ projectId, role }) => ({
			projectId,
			role,
		}));

		if (
			!(await this.identities.projectRolesExist(
				projectRoles.map(({ role }) => role),
				ctx,
			))
		) {
			return { ok: false, reason: 'no-role' };
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
				provider,
			},
		};
	}

	// Returns no roles when the mode is not `continuous`, so callers need one branch for both modes.
	private async mapIfContinuous(
		source: TrustedSource,
		claims: Readonly<Record<string, unknown>>,
		ctx: OperationContext,
	): Promise<Result<MappedRoles | undefined>> {
		if (source.config.identity.roleMapping.mode !== 'continuous') {
			return { ok: true, value: undefined };
		}
		return await this.mapRoles(source, claims, ctx);
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
		claims: Readonly<Record<string, unknown>>,
		ctx: OperationContext,
		mapped?: MappedRoles,
	): Promise<Resolved> {
		if (binding.status !== 'active') return { ok: false, reason: 'binding-inactive' };
		if (binding.user.disabled) return { ok: false, reason: 'user-disabled' };

		// A caller that already evaluated the rules passes the result, so the row is not evaluated twice.
		let mappedRoles = mapped;
		if (mappedRoles === undefined) {
			const result = await this.mapIfContinuous(source, claims, ctx);
			if (!result.ok) return result;
			mappedRoles = result.value;
		}

		if (isStale(binding.lastSeenAt)) {
			await this.identities.touchLastSeen(binding.sourceId, binding.subject, new Date(), ctx);
		}

		// Holds the roles to write, so the closure below sees a narrowed value.
		const continuous =
			mappedRoles !== undefined &&
			binding.provenance === 'jit' &&
			binding.user.role.slug !== GLOBAL_OWNER_ROLE_SLUG
				? mappedRoles
				: undefined;

		return {
			ok: true,
			value: {
				principal: principalFromUser(binding.user),
				// Role writes run after the commit, because `changeUserRole` opens its own transaction.
				...(continuous && {
					onCommit: async () => {
						await continuous.provider.applyResolvedRoles(
							binding.user,
							continuous.resolved,
							continuous.managed,
						);
						// The request that changed the role must run with the new role, so re-read it.
						if (
							!continuous.managed.instanceRole ||
							binding.user.role.slug === continuous.instanceRole
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
		ctx: OperationContext,
	): Promise<Resolved> {
		const row: InsertTrustedSourceIdentityRow = {
			sourceId: source.id,
			subject: external.subject,
			userId: user.id,
			provenance: 'claim-match',
			status: 'active',
		};

		const mapped = await this.mapIfContinuous(source, external.raw, ctx);
		if (!mapped.ok) return mapped;

		// Every policy check runs before the write, because a `Reject` does not roll the transaction back.
		await this.identities.insertIfAbsent(row, ctx);

		const binding = await this.identities.findBySubject(source.id, external.subject, ctx);
		if (binding === null) throw new UnexpectedError('Binding missing after insert');

		const accepted = await this.acceptBinding(source, binding, external.raw, ctx, mapped.value);

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
		ctx: OperationContext,
	): Promise<Resolved> {
		const { provision } = source.config.identity;

		if (provision.human === 'off') return { ok: false, reason: 'provision-refused' };

		const email = external.email;

		if (email === undefined || !isValidEmail(email))
			return { ok: false, reason: 'provision-refused' };

		// The config schema rejects jit provisioning without a role-mapping mode. This guards the type only.
		if (source.config.identity.roleMapping.mode === 'off') return { ok: false, reason: 'no-role' };

		const mapped = await this.mapRoles(source, external.raw, ctx);
		if (!mapped.ok) return mapped;
		const { instanceRole: role, projectRoles } = mapped.value;

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
			projectRoles,
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
		ctx: OperationContext,
	): Promise<Resolved> {
		const { linkByEmail } = source.config.identity;

		if (linkByEmail === 'off') return { ok: false, reason: 'link-refused' };

		// The link rule decides which email claims identify a person, for linking and for provisioning alike.
		const mayUseEmail =
			linkByEmail === 'any' || (linkByEmail === 'verified-only' && external.emailVerified === true);
		const email = mayUseEmail ? external.email : undefined;

		if (email !== undefined) {
			const user = await this.identities.findUserByEmail(email, ctx);
			if (user !== null) {
				if (user.disabled) return { ok: false, reason: 'user-disabled' };
				if (user.role.slug === GLOBAL_OWNER_ROLE_SLUG) return { ok: false, reason: 'link-refused' };

				return await this.link(source, external, user, ctx);
			}
		}
		return await this.provision(source, { ...external, email }, ctx);
	}

	private async resolveBinding(
		source: TrustedSource,
		external: ExternalIdentity,
	): Promise<Result<Principal>> {
		const result = await this.txRunner.run({}, async (ctx) => {
			const binding = await this.identities.findBySubject(source.id, external.subject, ctx);
			if (binding !== null) return await this.acceptBinding(source, binding, external.raw, ctx);
			return await this.linkOrProvision(source, external, ctx);
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
