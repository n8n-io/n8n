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

/** A resolved principal plus the event to emit once the transaction committed. */
type Resolved = Result<{ principal: Principal; onCommit?: () => void }>;

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
	) {
		super();
	}

	private async resolveByUserId(id: string): Promise<Result<Principal>> {
		const user = await this.users.findByIdWithRole(id);
		if (user === null) return { ok: false, reason: 'unknown-subject' };
		if (user.disabled) return { ok: false, reason: 'user-disabled' };
		return { ok: true, value: principalFromUser(user) };
	}

	private async acceptBinding(
		binding: TrustedSourceIdentityEntity,
		ctx: OperationContext,
	): Promise<Resolved> {
		if (binding.status !== 'active') return { ok: false, reason: 'binding-inactive' };
		if (binding.user.disabled) return { ok: false, reason: 'user-disabled' };

		if (isStale(binding.lastSeenAt)) {
			await this.identities.touchLastSeen(binding.sourceId, binding.subject, new Date(), ctx);
		}

		return {
			ok: true,
			value: {
				principal: principalFromUser(binding.user),
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
		await this.identities.insertIfAbsent(row, ctx);

		const binding = await this.identities.findBySubject(source.id, external.subject, ctx);
		if (binding === null) throw new UnexpectedError('Binding missing after insert');

		const accepted = await this.acceptBinding(binding, ctx);

		if (accepted.ok && binding.user.id === user.id) {
			return {
				ok: true,
				value: {
					principal: accepted.value.principal,
					onCommit: () => {
						this.eventService.emit('trusted-source-identity-linked', {
							userId: user.id,
							sourceId: source.id,
							subject: external.subject,
							issuer: source.issuer,
							provenance: 'claim-match',
						});
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
		const { provision, roleMapping } = source.config.identity;

		if (provision.human === 'off') return { ok: false, reason: 'provision-refused' };

		const email = external.email;

		if (email === undefined || !isValidEmail(email))
			return { ok: false, reason: 'provision-refused' };

		const role = roleMapping.fallbackInstanceRole;
		if (role === undefined || !(await this.isAssignableInstanceRole(role)))
			return { ok: false, reason: 'no-role' };

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
		);

		return {
			ok: true,
			value: {
				principal: principalFromUser(user),
				onCommit: () => {
					this.eventService.emit('trusted-source-user-provisioned', {
						userId: user.id,
						sourceId: source.id,
						subject: external.subject,
						issuer: source.issuer,
						role,
					});
				},
			},
		};
	}

	private async isAssignableInstanceRole(slug: string): Promise<boolean> {
		if (slug === GLOBAL_OWNER_ROLE_SLUG) return false;
		try {
			await this.roleService.checkRolesExist([slug], 'global');
		} catch (error) {
			if (error instanceof BadRequestError) return false;
			throw error;
		}
		return this.roleService.isRoleLicensed(slug);
	}

	private async linkOrProvision(
		source: TrustedSource,
		external: ExternalIdentity,
		ctx: OperationContext,
	): Promise<Resolved> {
		const { linkByEmail } = source.config.identity;

		if (linkByEmail === 'off') return { ok: false, reason: 'link-refused' };

		const email = external.email;
		const mayLookUp =
			linkByEmail === 'any' || (linkByEmail === 'verified-only' && external.emailVerified === true);

		if (mayLookUp && email !== undefined) {
			const user = await this.users.findByEmailWithRole(email);
			if (user !== null) {
				if (user.disabled) return { ok: false, reason: 'user-disabled' };
				if (user.role.slug === GLOBAL_OWNER_ROLE_SLUG) return { ok: false, reason: 'link-refused' };

				return await this.link(source, external, user, ctx);
			}
		}
		return await this.provision(source, external, ctx);
	}

	private async resolveBinding(
		source: TrustedSource,
		external: ExternalIdentity,
	): Promise<Result<Principal>> {
		const result = await this.txRunner.run({}, async (ctx) => {
			const binding = await this.identities.findBySubject(source.id, external.subject, ctx);
			if (binding !== null) return await this.acceptBinding(binding, ctx);
			return await this.linkOrProvision(source, external, ctx);
		});
		if (result.ok) {
			result.value.onCommit?.();
			return { ok: true, value: result.value.principal };
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
