import type { McpClientConnectedPeriod } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { UserConsent } from '../entities/oauth-user-consent.entity';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

type ConsentOwner = {
	id: string;
	firstName: string | null;
	lastName: string | null;
	email: string;
};

export type FindConnectedClientsOptions = {
	/** Restrict to a single user's consents (the "mine" view). */
	userId?: string;
	/** Join the owner so the caller can surface it (the "all" view). */
	withOwner?: boolean;
	/** Case-insensitive substring match on the client name. */
	name?: string;
	/** Restrict to a single owner (managers filtering the "all" view). */
	ownerId?: string;
	/**
	 * Restrict to these client ids. Used for the name-pattern "type" filter,
	 * which is resolved to matching clients up front (bounded by the registered
	 * client cap) so paging stays in SQL. Must be non-empty when provided.
	 */
	clientIds?: string[];
	/** Date bucket applied to the consent's `grantedAt`. */
	connected?: McpClientConnectedPeriod;
	/** Reference timestamp for the `connected` buckets. */
	now: number;
	skip?: number;
	/** When undefined, all matching rows are returned (no pagination). */
	take?: number;
};

@Service()
export class UserConsentRepository extends Repository<UserConsent> {
	constructor(dataSource: DataSource) {
		super(UserConsent, dataSource.manager);
	}

	/**
	 * Connected clients (a consent joined with its client) matching the given
	 * filters, newest grant first. Name/owner/date filters and pagination run
	 * in SQL; the returned `total` is the full match count ignoring skip/take.
	 * The `type` filter is a name-pattern match the DB can't express and is
	 * applied by the caller.
	 */
	async findConnectedClients(
		options: FindConnectedClientsOptions,
	): Promise<{ rows: UserConsent[]; total: number }> {
		const qb = this.createQueryBuilder('consent').leftJoinAndSelect('consent.client', 'client');

		if (options.withOwner) qb.leftJoinAndSelect('consent.user', 'user');
		if (options.userId) qb.andWhere('consent.userId = :userId', { userId: options.userId });
		if (options.ownerId) qb.andWhere('consent.userId = :ownerId', { ownerId: options.ownerId });
		if (options.clientIds) {
			qb.andWhere('consent.clientId IN (:...clientIds)', { clientIds: options.clientIds });
		}

		if (options.name?.trim()) {
			qb.andWhere('LOWER(client.name) LIKE :name', {
				name: `%${options.name.trim().toLowerCase()}%`,
			});
		}

		if (options.connected === 'last7') {
			qb.andWhere('consent.grantedAt >= :bound', { bound: options.now - 7 * DAY_IN_MS });
		} else if (options.connected === 'last30') {
			qb.andWhere('consent.grantedAt >= :bound', { bound: options.now - 30 * DAY_IN_MS });
		} else if (options.connected === 'older') {
			qb.andWhere('consent.grantedAt < :bound', { bound: options.now - 30 * DAY_IN_MS });
		}

		qb.orderBy('consent.grantedAt', 'DESC');

		if (options.take !== undefined) qb.skip(options.skip ?? 0).take(options.take);

		const [rows, total] = await qb.getManyAndCount();
		return { rows, total };
	}

	/**
	 * Distinct owners across every consent, for the "Connected by" filter. Not
	 * scoped by the current filters, so the dropdown always lists all owners.
	 */
	async findConsentOwners(): Promise<ConsentOwner[]> {
		return await this.createQueryBuilder('consent')
			.innerJoin('consent.user', 'user')
			.select('user.id', 'id')
			.addSelect('user.firstName', 'firstName')
			.addSelect('user.lastName', 'lastName')
			.addSelect('user.email', 'email')
			.distinct(true)
			.getRawMany<ConsentOwner>();
	}
}
