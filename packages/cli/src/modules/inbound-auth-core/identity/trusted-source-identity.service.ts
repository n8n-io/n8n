import { Logger } from '@n8n/backend-common';
import { EventService, RoleService } from '@n8n/backend-services';
import { principalFromUser, TransactionRunner, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	type ExternalIdentity,
	IdentityService,
	type Result,
	type Verified,
} from '@n8n/inbound-auth';
import type { Principal, SecurityContext } from '@n8n/permissions';

import { TrustedSourceIdentityRepository } from '../database/repositories/trusted-source-identity.repository';
import { translateClaims } from './external-identity';
import { Time } from '@n8n/constants';

// Stamp at most once a day so a busy caller does not write on every request.
function isStale(lastSeenAt: Date | null): boolean {
	return lastSeenAt === null || Date.now() - lastSeenAt.getTime() > Time.days.toMilliseconds;
}

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

	private async resolveBinding(sourceId: string, externalId: string): Promise<Result<Principal>> {
		return await this.txRunner.run({}, async (ctx) => {
			const binding = await this.identities.findBySubject(sourceId, externalId, ctx);
			if (binding === null) return { ok: false, reason: 'link-refused' };
			if (binding.status !== 'active') return { ok: false, reason: 'binding-inactive' };
			if (binding.user.disabled) return { ok: false, reason: 'user-disabled' };

			if (isStale(binding.lastSeenAt)) {
				await this.identities.touchLastSeen(sourceId, externalId, new Date(), ctx);
			}

			return {
				ok: true,
				value: principalFromUser(binding.user),
			};
		});
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
				: await this.resolveBinding(source.id, externalIdentity.subject);

		if (!resolved.ok) return resolved;

		return {
			ok: true,
			value: buildContext(verified, externalIdentity, resolved.value),
		};
	}
}
