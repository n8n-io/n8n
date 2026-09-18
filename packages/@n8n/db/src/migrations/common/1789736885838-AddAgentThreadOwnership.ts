import type { MigrationContext, ReversibleMigration } from '../migration-types';

type ThreadRow = {
	id: string;
	agentId: string;
	projectId: string;
	parentThreadId: string | null;
	parentAgentId: string | null;
	taskId: string | null;
	resourceId: string | null;
};

type Evidence = {
	thread: ThreadRow;
	owners: Set<string>;
	preview: boolean;
	shared: boolean;
	conflicting: boolean;
};

type Access = { accessScope: 'user' | 'project'; ownerId: string | null };

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
		const { escape, runQuery, runInBatches, parseJson } = context;
		const c = escape.columnName;
		const table = escape.tableName('agent_execution_threads');
		const evidence = new Map<string, Evidence>();
		const users = new Set(
			(
				await runQuery<Array<{ id: string }>>(`SELECT ${c('id')} FROM ${escape.tableName('user')}`)
			).map((user) => user.id),
		);

		await runInBatches<ThreadRow>(
			`SELECT ${['id', 'agentId', 'projectId', 'parentThreadId', 'parentAgentId', 'taskId'].map((name) => `t.${c(name)}`).join(', ')}, m.${c('resourceId')}
			 FROM ${table} t LEFT JOIN ${escape.tableName('agents_threads')} m ON m.${c('id')} = t.${c('id')}
			 ORDER BY t.${c('id')}`,
			async (rows) => {
				for (const thread of rows) {
					const entry: Evidence = {
						thread,
						owners: new Set(),
						preview: false,
						shared: thread.taskId !== null,
						conflicting: false,
					};
					this.addResource(entry, thread.resourceId);
					const legacyPrefix = `test-${thread.agentId}:`;
					if (thread.id.startsWith(legacyPrefix)) {
						entry.preview = true;
						entry.owners.add(thread.id.slice(legacyPrefix.length));
					} else if (thread.id === `test-${thread.agentId}`) {
						entry.preview = true;
					}
					evidence.set(thread.id, entry);
				}
			},
		);

		await runInBatches<{ threadId: string; source: string }>(
			`SELECT DISTINCT ${c('threadId')}, ${c('source')} FROM ${escape.tableName('agent_execution')}
			 WHERE ${c('source')} IS NOT NULL ORDER BY ${c('threadId')}, ${c('source')}`,
			async (rows) => {
				for (const row of rows) {
					const entry = evidence.get(row.threadId);
					if (!entry) continue;
					const source = row.source.trim().toLowerCase();
					if (['chat', 'n8n_chat', 'preview', 'mcp', 'instance-ai'].includes(source))
						entry.preview = true;
					if (
						['slack', 'telegram', 'discord', 'linear', 'task', 'schedule', 'workflow'].includes(
							source,
						)
					)
						entry.shared = true;
				}
			},
		);

		await runInBatches<{ agentId: string | null; state: string }>(
			`SELECT ${c('agentId')}, ${c('state')} FROM ${escape.tableName('agent_checkpoints')}
			 WHERE ${c('state')} IS NOT NULL ORDER BY ${c('runId')}`,
			async (rows) => {
				for (const row of rows) {
					let state: unknown;
					try {
						state = parseJson<unknown>(row.state);
					} catch {
						continue;
					}
					if (!state || typeof state !== 'object' || !('persistence' in state)) continue;
					const scope = state.persistence;
					if (
						!scope ||
						typeof scope !== 'object' ||
						!('threadId' in scope) ||
						typeof scope.threadId !== 'string'
					)
						continue;
					const entry = evidence.get(scope.threadId);
					if (!entry) continue;
					if (row.agentId !== entry.thread.agentId) entry.conflicting = true;
					if ('resourceId' in scope && typeof scope.resourceId === 'string')
						this.addResource(entry, scope.resourceId);
				}
			},
		);

		const resolved = new Map<string, Access>();
		const pending = new Map(evidence);
		while (pending.size > 0) {
			let progressed = false;
			for (const [id, entry] of pending) {
				const { parentThreadId, parentAgentId, projectId } = entry.thread;
				if (parentThreadId && pending.has(parentThreadId)) continue;
				if (parentThreadId) {
					const parent = evidence.get(parentThreadId)?.thread;
					const access = resolved.get(parentThreadId);
					if (parent?.agentId !== parentAgentId || parent.projectId !== projectId || !access) {
						entry.conflicting = true;
					} else if (access.accessScope === 'project') {
						entry.shared = true;
					} else {
						entry.preview = true;
						if (access.ownerId) entry.owners.add(access.ownerId);
						else entry.conflicting = true;
					}
				}
				let access: Access = { accessScope: 'user', ownerId: null };
				if (!entry.conflicting && !(entry.shared && entry.preview)) {
					const [ownerId] = entry.owners;
					if (entry.owners.size === 1 && users.has(ownerId)) access.ownerId = ownerId;
					else if (entry.shared && entry.owners.size === 0)
						access = { accessScope: 'project', ownerId: null };
				}
				resolved.set(id, access);
				pending.delete(id);
				progressed = true;
				if (access.ownerId || access.accessScope === 'project') {
					await runQuery(
						`UPDATE ${table} SET ${c('ownerId')} = :ownerId, ${c('accessScope')} = :accessScope WHERE ${c('id')} = :id`,
						{ id, ...access },
					);
				}
			}
			// Cyclic parent links retain the private, ownerless default.
			if (!progressed) break;
		}
	}

	private addResource(entry: Evidence, resourceId: string | null) {
		if (resourceId?.startsWith('draft-chat:')) {
			entry.preview = true;
			entry.owners.add(resourceId.slice('draft-chat:'.length));
		} else if (resourceId?.startsWith('integration:') || resourceId?.startsWith('task:')) {
			entry.shared = true;
		}
	}
}
