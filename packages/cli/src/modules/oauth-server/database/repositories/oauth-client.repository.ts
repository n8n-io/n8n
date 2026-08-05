import { Service } from '@n8n/di';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import { DataSource, Repository } from '@n8n/typeorm';

import { OAuthClient } from '../entities/oauth-client.entity';
import { UserConsent } from '../entities/oauth-user-consent.entity';

export type FindManualClientsOptions = {
	/** Restrict to clients registered by this user (the "mine" view). */
	createdBy?: string;
	/** Case-insensitive substring match on the client name. */
	name?: string;
	/**
	 * Restrict to these client ids, for the name-pattern "type" filter resolved
	 * by the caller. Must be non-empty when provided.
	 */
	clientIds?: string[];
	skip?: number;
	/** When undefined, all matching rows are returned (no pagination). */
	take?: number;
};

export type ManualClientCreator = {
	id: string;
	firstName: string | null;
	lastName: string | null;
	email: string;
};

@Service()
export class OAuthClientRepository extends Repository<OAuthClient> {
	constructor(dataSource: DataSource) {
		super(OAuthClient, dataSource.manager);
	}

	/**
	 * Manually registered clients nobody has consented to yet, newest first.
	 *
	 * These have no consent row, so the connected-clients listing can't reach
	 * them through its consent join — they are queried separately and merged in.
	 * Once a user completes the ceremony the consent row represents the client and
	 * it drops out of this result, so the two sets never overlap.
	 */
	async findUnconnectedManualClients(
		options: FindManualClientsOptions,
	): Promise<{ rows: OAuthClient[]; total: number }> {
		const qb = this.unconnectedManualClientsQuery(options.createdBy);

		if (options.clientIds) {
			qb.andWhere('client.id IN (:...clientIds)', { clientIds: options.clientIds });
		}
		if (options.name?.trim()) {
			qb.andWhere('LOWER(client.name) LIKE :name', {
				name: `%${options.name.trim().toLowerCase()}%`,
			});
		}

		qb.orderBy('client.createdAt', 'DESC');

		if (options.take !== undefined) qb.skip(options.skip ?? 0).take(options.take);

		const [rows, total] = await qb.getManyAndCount();
		return { rows, total };
	}

	/**
	 * Distinct creators of manually registered clients, for the "Connected by"
	 * filter. Not scoped by the current filters, so the dropdown always lists
	 * every owner.
	 */
	async findManualClientCreators(): Promise<ManualClientCreator[]> {
		return await this.createQueryBuilder('client')
			.innerJoin('client.creator', 'creator')
			.select('creator.id', 'id')
			.addSelect('creator.firstName', 'firstName')
			.addSelect('creator.lastName', 'lastName')
			.addSelect('creator.email', 'email')
			.distinct(true)
			.getRawMany<ManualClientCreator>();
	}

	/** Unfiltered count of unconnected manual clients, for the tab totals. */
	async countUnconnectedManualClients(createdBy?: string): Promise<number> {
		return await this.unconnectedManualClientsQuery(createdBy).getCount();
	}

	private unconnectedManualClientsQuery(createdBy?: string): SelectQueryBuilder<OAuthClient> {
		const qb = this.createQueryBuilder('client')
			.leftJoinAndSelect('client.creator', 'creator')
			.where('client.createdBy IS NOT NULL')
			.andWhere((where) => {
				const consents = where
					.subQuery()
					.select('1')
					.from(UserConsent, 'consent')
					.where('consent.clientId = client.id')
					.getQuery();
				return `NOT EXISTS ${consents}`;
			});

		if (createdBy) {
			qb.andWhere('client.createdBy = :createdBy', { createdBy });
		}

		return qb;
	}
}
