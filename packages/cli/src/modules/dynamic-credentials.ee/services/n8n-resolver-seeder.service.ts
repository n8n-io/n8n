import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { Cipher, InstanceSettings } from 'n8n-core';

import { SYSTEM_RESOLVER_ID, SYSTEM_RESOLVER_NAME, SYSTEM_RESOLVER_TYPE } from '../constants';
import { DynamicCredentialResolver } from '../database/entities/credential-resolver';
import { DynamicCredentialResolverRepository } from '../database/repositories/credential-resolver.repository';

/**
 * Seeds the system-managed `credential-resolver.n8n-1.0` row that every other
 * private-credentials feature builds on.
 *
 * Leader-only in multi-main deployments — see `InstanceVersionHistoryService.init()`
 * for the same pattern. Followers no-op because they share the same DB and rely on
 * the leader to have already written the row before workflows are created.
 */
@Service()
export class N8nResolverSeeder {
	constructor(
		private readonly repository: DynamicCredentialResolverRepository,
		private readonly cipher: Cipher,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('dynamic-credentials');
	}

	async seed(): Promise<DynamicCredentialResolver | undefined> {
		if (!this.instanceSettings.isLeader) {
			this.logger.debug('Skipping n8n resolver seed — instance is not the leader main');
			return;
		}

		const encryptedConfig = await this.cipher.encryptV2({});

		// Idempotent insert: on conflict with the unique id, do nothing. Avoids the
		// check-then-write race when two leaders briefly overlap during handoff.
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
