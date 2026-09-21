import type { MigrationContext, ReversibleMigration } from '../migration-types';

type ThreadRow = {
	id: string;
	agentId: string;
	taskId: string | null;
	resourceId: string | null;
};

type Evidence = {
	id: string;
	ownerId: string | null;
	preview: boolean;
	shared: boolean;
	conflicting: boolean;
};

type Access = { accessScope: 'user' | 'project'; ownerId: string | null };

type ReadyThread = {
	id: string;
	ownerId: string | null;
	preview: number;
	shared: number;
	conflicting: number;
	projectId: string;
	parentThreadId: string | null;
	parentAgentId: string | null;
	parentActualAgentId: string | null;
	parentProjectId: string | null;
	parentAccessScope: string | null;
	parentOwnerId: string | null;
	validOwnerId: string | null;
};

type CheckpointRow = { agentId: string | null; state: string };
type CheckpointScope = { agentId: string | null; threadId: string; resourceId: string | null };

const BATCH_SIZE = 100;
const STAGING_TABLE = 'agent_thread_ownership_backfill';

export class AddAgentThreadOwnership1789736885838 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const {
			schemaBuilder: { addColumns, column, addForeignKey, createIndex },
		} = context;
		await addColumns(
			'agent_execution_threads',
			[
				column('ownerId').uuid.comment('User who started this private session'),
				column('accessScope')
					.varchar(16)
					.notNull.default("'user'")
					.withEnumCheck(['user', 'project'])
					.comment('user: private session; project: shared integration, workflow, or task session'),
			],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(
			'agent_execution_threads',
			'ownerId',
			['user', 'id'],
			'FK_agent_execution_threads_owner',
			'SET NULL',
		);
		await createIndex('agent_execution_threads', ['ownerId']);
		await this.backfill(context);
	}

	async down({
		schemaBuilder: { dropForeignKey, dropIndex, dropColumns, dropEnumCheck },
	}: MigrationContext) {
		await dropForeignKey(
			'agent_execution_threads',
			'ownerId',
			['user', 'id'],
			'FK_agent_execution_threads_owner',
		);
		await dropIndex('agent_execution_threads', ['ownerId']);
		await dropEnumCheck('agent_execution_threads', 'accessScope', { recreatesOnSqlite: true });
		await dropColumns('agent_execution_threads', ['ownerId', 'accessScope'], {
			recreatesOnSqlite: true,
		});
	}

	private async backfill(context: MigrationContext) {
		const dropStage = async () =>
			await context.runQuery(`DROP TABLE IF EXISTS ${context.escape.tableName(STAGING_TABLE)}`);
		await this.createStage(context);
		try {
			await this.stageThreads(context);
			await this.stageSources(context);
			await this.stageCheckpoints(context);
			await this.resolveParents(context);
			await this.writeAccess(context);
		} catch (error) {
			// PostgreSQL can reject cleanup until the failed transaction rolls back.
			await dropStage().catch(() => {});
			throw error;
		}
		await dropStage();
	}

	private async createStage({ escape, runQuery }: MigrationContext) {
		const c = escape.columnName;
		const table = escape.tableName(STAGING_TABLE);
		await runQuery(`CREATE TEMPORARY TABLE ${table} (
			${c('id')} TEXT PRIMARY KEY,
			${c('ownerId')} TEXT,
			${c('preview')} INTEGER NOT NULL DEFAULT 0,
			${c('shared')} INTEGER NOT NULL DEFAULT 0,
			${c('conflicting')} INTEGER NOT NULL DEFAULT 0,
			${c('resolved')} INTEGER NOT NULL DEFAULT 0,
			${c('accessScope')} TEXT NOT NULL DEFAULT 'user',
			${c('resolvedOwnerId')} TEXT
		)`);
		await runQuery(
			`CREATE INDEX ${escape.indexName('agent_thread_ownership_pending')} ON ${table} (${c('resolved')}, ${c('id')})`,
		);
	}

	private async stageThreads(context: MigrationContext) {
		const { escape, runInBatches } = context;
		const c = escape.columnName;
		await runInBatches<ThreadRow>(
			`SELECT t.${c('id')}, t.${c('agentId')}, t.${c('taskId')}, m.${c('resourceId')}
			 FROM ${escape.tableName('agent_execution_threads')} t
			 LEFT JOIN ${escape.tableName('agents_threads')} m ON m.${c('id')} = t.${c('id')}
			 ORDER BY t.${c('id')}`,
			async (rows) =>
				await this.saveEvidence(
					context,
					rows.map((row) => this.threadEvidence(row)),
				),
			BATCH_SIZE,
		);
	}

	private threadEvidence(thread: ThreadRow): Evidence {
		const entry = this.emptyEvidence(thread.id);
		entry.shared = thread.taskId !== null;
		this.addResource(entry, thread.resourceId);
		const legacyPrefix = `test-${thread.agentId}:`;
		if (thread.id.startsWith(legacyPrefix)) {
			entry.preview = true;
			this.addOwner(entry, thread.id.slice(legacyPrefix.length));
		} else if (thread.id === `test-${thread.agentId}`) {
			entry.preview = true;
		}
		return entry;
	}

	private async stageSources({ escape, runQuery }: MigrationContext) {
		const c = escape.columnName;
		const table = escape.tableName(STAGING_TABLE);
		const sources = {
			preview: ['chat', 'n8n_chat', 'preview', 'mcp', 'instance-ai'],
			shared: ['slack', 'telegram', 'discord', 'linear', 'task', 'schedule', 'workflow'],
		};
		for (const [flag, values] of Object.entries(sources)) {
			await runQuery(
				`UPDATE ${table} SET ${c(flag)} = 1 WHERE EXISTS (
					SELECT 1 FROM ${escape.tableName('agent_execution')} e
					WHERE e.${c('threadId')} = ${table}.${c('id')}
					AND LOWER(TRIM(e.${c('source')})) IN (:...sources)
				)`,
				{ sources: values },
			);
		}
	}

	private async stageCheckpoints(context: MigrationContext) {
		const { escape, runInBatches } = context;
		const c = escape.columnName;
		await runInBatches<CheckpointRow>(
			`SELECT ${c('agentId')}, ${c('state')} FROM ${escape.tableName('agent_checkpoints')}
			 WHERE ${c('state')} IS NOT NULL ORDER BY ${c('runId')}`,
			async (rows) => await this.saveCheckpointBatch(context, rows),
			BATCH_SIZE,
		);
	}

	private checkpointScope(context: MigrationContext, row: CheckpointRow): CheckpointScope | null {
		let state: unknown;
		try {
			state = context.parseJson<unknown>(row.state);
		} catch {
			return null;
		}
		if (!state || typeof state !== 'object' || !('persistence' in state)) return null;
		const scope = state.persistence;
		if (!scope || typeof scope !== 'object' || !('threadId' in scope)) return null;
		if (typeof scope.threadId !== 'string') return null;
		return {
			agentId: row.agentId,
			threadId: scope.threadId,
			resourceId:
				'resourceId' in scope && typeof scope.resourceId === 'string' ? scope.resourceId : null,
		};
	}

	private async saveCheckpointBatch(context: MigrationContext, rows: CheckpointRow[]) {
		const scopes = rows.flatMap((row) => this.checkpointScope(context, row) ?? []);
		if (scopes.length === 0) return;
		const { escape, runQuery } = context;
		const c = escape.columnName;
		const threads = await runQuery<Array<{ id: string; agentId: string }>>(
			`SELECT ${c('id')}, ${c('agentId')} FROM ${escape.tableName('agent_execution_threads')}
			 WHERE ${c('id')} IN (:...ids)`,
			{ ids: scopes.map((scope) => scope.threadId) },
		);
		const agents = new Map(threads.map((thread) => [thread.id, thread.agentId]));
		const entries = scopes
			.filter((scope) => agents.has(scope.threadId))
			.map((scope) => {
				const entry = this.emptyEvidence(scope.threadId);
				entry.conflicting = scope.agentId !== agents.get(scope.threadId);
				this.addResource(entry, scope.resourceId);
				return entry;
			});
		await this.saveEvidence(context, entries);
	}

	private async saveEvidence(context: MigrationContext, entries: Evidence[]) {
		if (entries.length === 0) return;
		const { escape, runQuery } = context;
		const c = escape.columnName;
		const table = escape.tableName(STAGING_TABLE);
		const params: Record<string, string | number | null> = {};
		const values = this.mergeBatch(entries).map((entry, index) => {
			const row = [entry.id, entry.ownerId, +entry.preview, +entry.shared, +entry.conflicting];
			return `(${row
				.map((value, column) => {
					const key = `p${index}_${column}`;
					params[key] = value;
					return `:${key}`;
				})
				.join(', ')})`;
		});
		const currentOwner = `${table}.${c('ownerId')}`;
		const nextOwner = `excluded.${c('ownerId')}`;
		const flags = ['preview', 'shared', 'conflicting'].map((flag) => {
			const ownerConflict = flag === 'conflicting' ? ` OR ${currentOwner} <> ${nextOwner}` : '';
			return `${c(flag)} = CASE WHEN ${table}.${c(flag)} = 1 OR excluded.${c(flag)} = 1${ownerConflict} THEN 1 ELSE 0 END`;
		});
		await runQuery(
			`INSERT INTO ${table} (${['id', 'ownerId', 'preview', 'shared', 'conflicting'].map(c).join(', ')})
			 VALUES ${values.join(', ')} ON CONFLICT (${c('id')}) DO UPDATE SET
			 ${c('ownerId')} = COALESCE(${currentOwner}, ${nextOwner}), ${flags.join(', ')}`,
			params,
		);
	}

	private mergeBatch(entries: Evidence[]): Evidence[] {
		const merged = new Map<string, Evidence>();
		for (const entry of entries) {
			const existing = merged.get(entry.id);
			if (!existing) {
				merged.set(entry.id, entry);
				continue;
			}
			existing.preview ||= entry.preview;
			existing.shared ||= entry.shared;
			existing.conflicting ||= entry.conflicting;
			if (entry.ownerId !== null) this.addOwner(existing, entry.ownerId);
		}
		return [...merged.values()];
	}

	private async resolveParents(context: MigrationContext) {
		while (true) {
			const rows = await this.readyThreads(context);
			// Unresolved cycles retain the private, ownerless default.
			if (rows.length === 0) return;
			const resolved = rows.map((row) => ({ id: row.id, ...this.resolveAccess(row) }));
			await this.saveResolved(context, resolved);
		}
	}

	private async readyThreads({ escape, runQuery }: MigrationContext): Promise<ReadyThread[]> {
		const c = escape.columnName;
		const table = escape.tableName(STAGING_TABLE);
		const threads = escape.tableName('agent_execution_threads');
		return await runQuery<ReadyThread[]>(
			`SELECT s.${c('id')}, s.${c('ownerId')}, s.${c('preview')}, s.${c('shared')}, s.${c('conflicting')},
			 t.${c('projectId')}, t.${c('parentThreadId')}, t.${c('parentAgentId')},
			 p.${c('agentId')} AS ${c('parentActualAgentId')}, p.${c('projectId')} AS ${c('parentProjectId')},
			 ps.${c('accessScope')} AS ${c('parentAccessScope')}, ps.${c('resolvedOwnerId')} AS ${c('parentOwnerId')},
			 u.${c('id')} AS ${c('validOwnerId')}
			 FROM ${table} s JOIN ${threads} t ON t.${c('id')} = s.${c('id')}
			 LEFT JOIN ${threads} p ON p.${c('id')} = t.${c('parentThreadId')}
			 LEFT JOIN ${table} ps ON ps.${c('id')} = p.${c('id')}
			 LEFT JOIN ${escape.tableName('user')} u
			 ON CAST(u.${c('id')} AS TEXT) = COALESCE(s.${c('ownerId')}, ps.${c('resolvedOwnerId')})
			 WHERE s.${c('resolved')} = 0 AND (t.${c('parentThreadId')} IS NULL OR p.${c('id')} IS NULL OR ps.${c('resolved')} = 1)
			 ORDER BY s.${c('id')} LIMIT ${BATCH_SIZE}`,
		);
	}

	private resolveAccess(row: ReadyThread): Access {
		const entry: Evidence = {
			id: row.id,
			ownerId: row.ownerId,
			preview: row.preview === 1,
			shared: row.shared === 1,
			conflicting: row.conflicting === 1,
		};
		this.inheritParent(entry, row);
		if (!entry.conflicting && !(entry.shared && entry.preview)) {
			if (entry.ownerId !== null && entry.ownerId === row.validOwnerId)
				return { accessScope: 'user', ownerId: entry.ownerId };
			if (entry.shared && entry.ownerId === null) return { accessScope: 'project', ownerId: null };
		}
		return { accessScope: 'user', ownerId: null };
	}

	private inheritParent(entry: Evidence, row: ReadyThread) {
		if (!row.parentThreadId) return;
		if (row.parentActualAgentId !== row.parentAgentId || row.parentProjectId !== row.projectId) {
			entry.conflicting = true;
		} else if (row.parentAccessScope === 'project') {
			entry.shared = true;
		} else {
			entry.preview = true;
			if (row.parentOwnerId) this.addOwner(entry, row.parentOwnerId);
			else entry.conflicting = true;
		}
	}

	private async saveResolved(context: MigrationContext, rows: Array<Access & { id: string }>) {
		const { escape, runQuery } = context;
		const c = escape.columnName;
		const params: Record<string, string | null> = {};
		const ids = rows.map((row, index) => {
			params[`id${index}`] = row.id;
			params[`scope${index}`] = row.accessScope;
			params[`owner${index}`] = row.ownerId;
			return `:id${index}`;
		});
		const cases = (key: string) => rows.map((_, i) => `WHEN :id${i} THEN :${key}${i}`).join(' ');
		await runQuery(
			`UPDATE ${escape.tableName(STAGING_TABLE)} SET ${c('resolved')} = 1,
			 ${c('accessScope')} = CASE ${c('id')} ${cases('scope')} END,
			 ${c('resolvedOwnerId')} = CASE ${c('id')} ${cases('owner')} END
			 WHERE ${c('id')} IN (${ids.join(', ')})`,
			params,
		);
	}

	private async writeAccess({ escape, runQuery }: MigrationContext) {
		const c = escape.columnName;
		const table = escape.tableName('agent_execution_threads');
		const stage = escape.tableName(STAGING_TABLE);
		await runQuery(
			`UPDATE ${table} SET
			 ${c('ownerId')} = (SELECT u.${c('id')} FROM ${stage} s
			 LEFT JOIN ${escape.tableName('user')} u ON CAST(u.${c('id')} AS TEXT) = s.${c('resolvedOwnerId')}
			 WHERE s.${c('id')} = ${table}.${c('id')}),
			 ${c('accessScope')} = (SELECT s.${c('accessScope')} FROM ${stage} s WHERE s.${c('id')} = ${table}.${c('id')})
			 WHERE ${c('id')} IN (SELECT ${c('id')} FROM ${stage}
			 WHERE ${c('resolved')} = 1 AND (${c('resolvedOwnerId')} IS NOT NULL OR ${c('accessScope')} = 'project'))`,
		);
	}

	private emptyEvidence(id: string): Evidence {
		return { id, ownerId: null, preview: false, shared: false, conflicting: false };
	}

	private addOwner(entry: Evidence, ownerId: string) {
		if (entry.ownerId !== null && entry.ownerId !== ownerId) entry.conflicting = true;
		entry.ownerId ??= ownerId;
	}

	private addResource(entry: Evidence, resourceId: string | null) {
		if (resourceId?.startsWith('draft-chat:')) {
			entry.preview = true;
			this.addOwner(entry, resourceId.slice('draft-chat:'.length));
		} else if (resourceId?.startsWith('integration:') || resourceId?.startsWith('task:')) {
			entry.shared = true;
		}
	}
}
