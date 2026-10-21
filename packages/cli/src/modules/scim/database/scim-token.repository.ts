import { BaseRepository, Settings, TransactionRunner, User, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager } from '@n8n/typeorm';
import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import { ScimTokenConflictError } from '../scim.errors';

/** The settings row that holds the instance SCIM token. */
export const SCIM_TOKEN_SETTINGS_KEY = 'scim.provisioning.token';

/** The row keeps the hashes of this many replaced tokens. */
const PREVIOUS_TOKEN_LIMIT = 10;

/** Hex SHA-256 hash of a token. See `hashScimToken`. */
const tokenHashSchema = z.string().regex(/^[0-9a-f]{64}$/);

const isoDate = z
	.string()
	.datetime()
	.transform((value) => new Date(value));

const storedTokenSchema = z.object({
	tokenHash: tokenHashSchema,
	/** Last four characters of the token, so that admins can identify it. */
	tokenHint: z.string(),
	/**
	 * The ID stays when the user is deleted. Resolve the user when you read it.
	 * The user lookup fails on Postgres for an ID that is not a UUID.
	 */
	createdById: z.string().uuid(),
	createdAt: isoDate,
	/** The last request that the token authenticated. */
	lastUsedAt: isoDate.nullable().default(null),
});

const tokenStateSchema = z.object({
	current: storedTokenSchema.nullable(),
	/**
	 * Hashes of the last tokens that a rotation or a revoke replaced, the
	 * newest first. They tell an old token of this instance from an unknown
	 * token. A list that does not parse is empty, so that it does not remove
	 * the current token.
	 */
	previousTokenHashes: z.array(tokenHashSchema).catch([]),
});

export type StoredScimToken = z.infer<typeof storedTokenSchema>;
export type NewScimToken = Omit<StoredScimToken, 'lastUsedAt'>;
export type ScimTokenState = z.infer<typeof tokenStateSchema>;

type TokenCreator = Pick<User, 'id' | 'firstName' | 'lastName'>;

const NO_TOKEN: ScimTokenState = { current: null, previousTokenHashes: [] };

/**
 * A row that does not parse holds no usable hash, so it counts as no token.
 * The next rotation writes over it.
 */
const parseState = (value: string): ScimTokenState => {
	const result = tokenStateSchema.safeParse(jsonParse<unknown>(value, { fallbackValue: null }));
	return result.success ? result.data : NO_TOKEN;
};

/** Adds the hash of a replaced token to the history, the newest first. */
const remember = (state: ScimTokenState): string[] =>
	state.current
		? [state.current.tokenHash, ...state.previousTokenHashes].slice(0, PREVIOUS_TOKEN_LIMIT)
		: state.previousTokenHashes;

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

	/** The current token and the hashes of replaced tokens, read without a lock. */
	async findTokenState(ctx: OperationContext): Promise<ScimTokenState> {
		const row = await this.table
			.managerFor(ctx)
			.findOneBy(Settings, { key: SCIM_TOKEN_SETTINGS_KEY });

		return row ? parseState(row.value) : NO_TOKEN;
	}

	async findInstanceToken(ctx: OperationContext): Promise<StoredScimToken | null> {
		return (await this.findTokenState(ctx)).current;
	}

	/**
	 * The instance token and its creator, for display. The creator is null
	 * after the user was deleted.
	 */
	async findInstanceTokenWithCreator(
		ctx: OperationContext,
	): Promise<(StoredScimToken & { createdBy: TokenCreator | null }) | null> {
		const token = await this.findInstanceToken(ctx);
		if (!token) return null;

		const createdBy = await this.table.managerFor(ctx).findOne(User, {
			where: { id: token.createdById },
			select: { id: true, firstName: true, lastName: true },
		});

		return { ...token, createdBy };
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

			await this.write(tx, {
				current: { ...token, lastUsedAt: null },
				previousTokenHashes: remember(state),
			});
		});
	}

	/** Removes the token, whoever created it. */
	async revokeInstanceToken(ctx: OperationContext): Promise<void> {
		await this.table.runInTransaction(ctx, async (tx) => {
			const state = await this.lockState(tx);
			if (!state.current) return;

			await this.write(tx, { current: null, previousTokenHashes: remember(state) });
		});
	}

	/**
	 * Sets the time of the last request that the token authenticated. The
	 * write is for the token with this hash only, so a write after a rotation
	 * does not mark the new token as used.
	 *
	 * The write changes only an older time. Thus a write from another main, or
	 * a slow commit, cannot move the time back.
	 */
	async markUsed(tokenHash: string, at: Date, ctx: OperationContext): Promise<void> {
		await this.table.runInTransaction(ctx, async (tx) => {
			const state = await this.lockState(tx);
			const { current } = state;

			if (current?.tokenHash !== tokenHash) return;
			if (current.lastUsedAt && current.lastUsedAt.getTime() >= at.getTime()) return;

			await this.write(tx, { ...state, current: { ...current, lastUsedAt: at } });
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
