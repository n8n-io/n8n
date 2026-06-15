import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager } from '@n8n/typeorm';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { DataSource, Repository } from '@n8n/typeorm';

import { DynamicCredentialUserEntry } from '../entities/dynamic-credential-user-entry';

@Service()
export class DynamicCredentialUserEntryRepository extends Repository<DynamicCredentialUserEntry> {
	constructor(dataSource: DataSource) {
		super(DynamicCredentialUserEntry, dataSource.manager);
	}

	async deleteByPairs(
		pairs: Array<{ credentialId: string; userId: string }>,
		em: EntityManager,
	): Promise<void> {
		if (pairs.length === 0) return;

		const whereClauses = pairs.map((_, i) => `(credentialId = :cid${i} AND userId = :uid${i})`);
		const params = Object.fromEntries(
			pairs.flatMap(({ credentialId, userId }, i) => [
				[`cid${i}`, credentialId],
				[`uid${i}`, userId],
			]),
		);

		await em
			.createQueryBuilder()
			.delete()
			.from(DynamicCredentialUserEntry)
			.where(whereClauses.join(' OR '), params)
			.execute();
	}
}
