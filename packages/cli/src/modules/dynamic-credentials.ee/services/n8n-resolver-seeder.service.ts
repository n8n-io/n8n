import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { SYSTEM_RESOLVER_ID, SYSTEM_RESOLVER_NAME, SYSTEM_RESOLVER_TYPE } from '../constants';
import { DynamicCredentialResolverRegistry } from './credential-resolver-registry.service';
import { DynamicCredentialResolver } from '../database/entities/credential-resolver';
import { DynamicCredentialResolverRepository } from '../database/repositories/credential-resolver.repository';

/**
 * Seeds the system-managed `credential-resolver.n8n-1.0` row that every other
 * private-credentials feature builds on.
 *
 * Runs on every main at startup (not leader-only): the insert is idempotent
 * (`orIgnore`), so this is safe under concurrency and self-heals the row on the
 * next boot of any main. A leader-only seed only ran when a main happened to be
 * leader *at init time* — in multi-main rolling deploys a booting main is almost
 * always a follower (the outgoing leader still holds the lock), and later
 * promotion via `takeOverAsLeader()` never re-runs init, so the row could stay
 * missing indefinitely.
 */
@Service()
export class N8nResolverSeeder {
	constructor(
		private readonly repository: DynamicCredentialResolverRepository,
		private readonly cipher: Cipher,
		private readonly registry: DynamicCredentialResolverRegistry,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('dynamic-credentials');
	}

	async seed(): Promise<DynamicCredentialResolver | undefined> {
		// Fail loudly if the constant has drifted from the resolver class's metadata.name.
		// Relies on `DynamicCredentialsModule.init()` calling `registry.init()` before
		// `seeder.seed()`. Without this check, drift seeds a row whose `type` no
		// longer resolves in the registry and every later credential lookup fails silently.
		if (!this.registry.getResolverByTypename(SYSTEM_RESOLVER_TYPE)) {
			throw new UnexpectedError(
				`SYSTEM_RESOLVER_TYPE "${SYSTEM_RESOLVER_TYPE}" is not registered in the resolver registry. The constant must match the seeded resolver class's metadata.name.`,
			);
		}

		const encryptedConfig = await this.cipher.encryptV2({});

		// Idempotent insert: on conflict with the unique id, do nothing. Lets every
		// main seed concurrently on startup without a check-then-write race.
		const result = await this.repository
			.createQueryBuilder()
			.insert()
			.into(DynamicCredentialResolver)
			.values({
				id: SYSTEM_RESOLVER_ID,
				name: SYSTEM_RESOLVER_NAME,
				type: SYSTEM_RESOLVER_TYPE,
				config: encryptedConfig,
			})
			.orIgnore()
			.execute();

		const inserted = result.identifiers.length > 0;
		if (inserted) {
			this.logger.info(`Seeded system credential resolver "${SYSTEM_RESOLVER_ID}"`);
		} else {
			this.logger.debug(`System credential resolver "${SYSTEM_RESOLVER_ID}" already seeded`);
		}

		return (await this.repository.findOneBy({ id: SYSTEM_RESOLVER_ID })) ?? undefined;
	}
}
