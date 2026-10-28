import { Service } from '@n8n/di';
import type { Repository } from '@n8n/typeorm';
import { DataSource, In, IsNull, Not } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { Person } from '../entities';
import type { IPersonalizationSurveyAnswers } from '../entities/types-db';
import { type OperationContext, TransactionRunner } from '../services/transaction';
import { isUniqueConstraintError } from '../utils/is-unique-constraint-error';

/** The `User` collection that the cloud hooks receive. */
export type CloudHooksPeople = Repository<Person>;

class PersonTable extends BaseRepository<Person> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Person, dataSource.manager, transactionRunner);
	}

	override managerFor(ctx: OperationContext) {
		return super.managerFor(ctx);
	}
}

@Service()
export class PersonRepository {
	private readonly table: PersonTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new PersonTable(dataSource, transactionRunner);
	}

	async findById(id: string, ctx: OperationContext = {}): Promise<Person | null> {
		return await this.table.managerFor(ctx).findOneBy(Person, { id });
	}

	async findByIdWithRole(id: string, ctx: OperationContext = {}): Promise<Person | null> {
		return await this.table.managerFor(ctx).findOne(Person, { where: { id }, relations: ['role'] });
	}

	/** With the role and the auth identities, which login and SSO checks read. */
	async findByIdWithAuthIdentities(id: string): Promise<Person | null> {
		return await this.table.findOne({ where: { id }, relations: ['authIdentities', 'role'] });
	}

	async findByEmail(email: string): Promise<Person | null> {
		return await this.table.findOneBy({ email });
	}

	/** With the role and the auth identities, which login and SSO checks read. */
	async findByEmailWithAuthIdentities(email: string): Promise<Person | null> {
		return await this.table.findOne({ where: { email }, relations: ['authIdentities', 'role'] });
	}

	/** A person who has set a password, so who has accepted their invite. */
	async findSetUpByEmail(email: string): Promise<Person | null> {
		return await this.table.findOne({
			where: { email, password: Not(IsNull()) },
			relations: ['authIdentities', 'role'],
		});
	}

	async findByLdapId(ldapId: string): Promise<Person | null> {
		return await this.table.findOne({
			where: { authIdentities: { providerId: ldapId, providerType: 'ldap' } },
			relations: { role: true },
		});
	}

	/** The id and email of each person in `ids` who has accepted their invite. */
	async getEmailsByIds(ids: string[]): Promise<Array<Pick<Person, 'id' | 'email'>>> {
		return await this.table.find({
			select: ['id', 'email'],
			where: { id: In(ids), password: Not(IsNull()) },
		});
	}

	async countWithMfaEnabled(): Promise<number> {
		return await this.table.count({ where: { mfaEnabled: true } });
	}

	async save(person: Person, ctx: OperationContext = {}): Promise<Person> {
		return await this.table.managerFor(ctx).save(Person, person);
	}

	/** The survey has changed versions, so a newer answer set may lack older fields. */
	async saveSurveyAnswers(
		id: string,
		answers: Partial<IPersonalizationSurveyAnswers>,
	): Promise<void> {
		await this.table.update({ id }, { personalizationAnswers: answers });
	}

	async disableMfa(id: string): Promise<void> {
		await this.table.update({ id }, { mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: [] });
	}

	/**
	 * Change a person's email only if it still equals `oldEmail`. Returns `'stale'`
	 * when the email changed concurrently and `'email-taken'` when another account
	 * already owns `newEmail`, so the caller can reject the request.
	 * Uses `save` (not `update`) so the personal-project rename subscriber fires.
	 */
	async changeEmail(
		id: string,
		oldEmail: string,
		newEmail: string,
	): Promise<'changed' | 'stale' | 'email-taken'> {
		return await this.table.manager.transaction(async (trx) => {
			const person = await trx.findOne(Person, {
				where: { id },
				// Serialize concurrent changes on Postgres; SQLite serializes writes.
				...(trx.connection.options.type === 'postgres'
					? { lock: { mode: 'pessimistic_write' as const } }
					: {}),
			});
			if (person?.email !== oldEmail) return 'stale';
			person.email = newEmail;
			try {
				await trx.save(Person, person);
			} catch (error) {
				// Another account took `newEmail` between the caller's check and this save.
				if (isUniqueConstraintError(error)) return 'email-taken';
				throw error;
			}
			return 'changed';
		});
	}

	/**
	 * The full TypeORM repository behind the `User` collection that the cloud
	 * hooks receive. The hooks call `find`, `count` and `save` on it directly, so
	 * named methods cannot replace it. Do not use it for anything else.
	 */
	forCloudHooks(): CloudHooksPeople {
		return this.table;
	}
}
