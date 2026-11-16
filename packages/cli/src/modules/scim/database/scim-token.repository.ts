import { BaseRepository, Settings, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager } from '@n8n/typeorm';
import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import { ScimTokenConflictError } from '../scim.errors';

/** The settings row that holds the instance SCIM token. */
export const SCIM_TOKEN_SETTINGS_KEY = 'scim.provisioning.token';

const isoDate = z
	.string()
	.datetime()
	.transform((value) => new Date(value));

const storedTokenSchema = z.object({
	/** Hex SHA-256 hash of the token. See `hashScimToken`. */
	tokenHash: z.string().regex(/^[0-9a-f]{64}$/),
	/** Last four characters of the token, so that admins can identify it. */
	tokenHint: z.string(),
	/** The ID stays when the user is deleted. Resolve the user when you read it. */
	createdById: z.string(),
	createdAt: isoDate,
});

const tokenStateSchema = z.object({ current: storedTokenSchema.nullable() });

export type StoredScimToken = z.infer<typeof storedTokenSchema>;
export type NewScimToken = StoredScimToken;

type ScimTokenState = z.infer<typeof tokenStateSchema>;

const NO_TOKEN: ScimTokenState = { current: null };

/**
 * A row that does not parse holds no usable hash, so it counts as no token.
 * The next rotation writes over it.
 */
const parseState = (value: string): ScimTokenState => {
	const result = tokenStateSchema.safeParse(jsonParse<unknown>(value, { fallbackValue: null }));
	return result.success ? result.data : NO_TOKEN;
};

class SettingsTable extends BaseRepository<Settings> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Settings, dataSource.manager, transactionRunner);
	}
}

/**
 * The instance SCIM token. One settings row holds a hash and a hint of the
 * token, never the token. The row does not load on startup, so the hash
 * stays out of the in-memory config.
 */
@Service()
export class ScimTokenRepository {
	private readonly table: SettingsTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new SettingsTable(dataSource, transactionRunner);
	}

	async findInstanceToken(ctx: OperationContext): Promise<StoredScimToken | null> {
		const row = await this.table
			.managerFor(ctx)
			.findOneBy(Settings, { key: SCIM_TOKEN_SETTINGS_KEY });

		return row ? parseState(row.value).current : null;
	}

	/**
	 * Replaces the token that the caller read with a new one, in one
	 * transaction. `expectedTokenHash` is null when the caller read no token.
	 *
	 * Throws `ScimTokenConflictError` when another request replaced or revoked
	 * the expected token first. Thus of two rotations from the same state, one
	 * fails, and the instance never holds two tokens.
	 */
	async replace(
		expectedTokenHash: string | null,
		token: NewScimToken,
		ctx: OperationContext,
	): Promise<void> {
		await this.table.runInTransaction(ctx, async (tx) => {
			const state = await this.lockState(tx);

			if ((state.current?.tokenHash ?? null) !== expectedTokenHash) {
				throw new ScimTokenConflictError();
			}

			await this.write(tx, { ...state, current: token });
		});
	}

	/** Removes the token, whoever created it. */
	async revokeInstanceToken(ctx: OperationContext): Promise<void> {
		await this.table.runInTransaction(ctx, async (tx) => {
			const state = await this.lockState(tx);
			if (!state.current) return;

			await this.write(tx, { ...state, current: null });
		});
	}

	/**
	 * Creates the row when it is missing, then locks it until the transaction
	 * ends. Thus concurrent writers take turns, also on an instance that never
	 * had a token. SQLite allows one write transaction at a time.
	 */
	private async lockState(tx: EntityManager): Promise<ScimTokenState> {
		await tx
			.createQueryBuilder()
			.insert()
			.into(Settings)
			.values({
				key: SCIM_TOKEN_SETTINGS_KEY,
				value: JSON.stringify(NO_TOKEN),
				loadOnStartup: false,
			})
			.orIgnore()
			.execute();

		const row = await tx.findOneOrFail(Settings, {
			where: { key: SCIM_TOKEN_SETTINGS_KEY },
			lock: tx.connection.options.type === 'postgres' ? { mode: 'pessimistic_write' } : undefined,
		});

		return parseState(row.value);
	}

	private async write(tx: EntityManager, state: ScimTokenState) {
		await tx.update(Settings, { key: SCIM_TOKEN_SETTINGS_KEY }, { value: JSON.stringify(state) });
	}
}
