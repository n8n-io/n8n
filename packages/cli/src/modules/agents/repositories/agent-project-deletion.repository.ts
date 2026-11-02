import {
	BaseRepository,
	Project,
	Settings,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { UserError } from 'n8n-workflow';

class ProjectDeletionTable extends BaseRepository<Project> {
	constructor(dataSource: DataSource, transactions: TransactionRunner) {
		super(Project, dataSource.manager, transactions);
	}
}

/** Fence Agent writes across mains. Keep the marker if cleanup fails so deletion can retry. */
@Service()
export class AgentProjectDeletionRepository {
	private readonly table: ProjectDeletionTable;

	constructor(
		dataSource: DataSource,
		private readonly transactions: TransactionRunner,
	) {
		this.table = new ProjectDeletionTable(dataSource, transactions);
	}

	private markerKey(projectId: string): string {
		return `agents.projectDeletion.${projectId}`;
	}

	async beginDeletion(projectId: string): Promise<void> {
		await this.transactions.run({}, async (ctx) => {
			const manager = this.table.managerFor(ctx);
			// SQLite write transactions serialize this operation. PostgreSQL needs a row lock.
			const project = await manager.findOne(Project, {
				where: { id: projectId },
				lock:
					manager.connection.options.type === 'postgres'
						? { mode: 'pessimistic_write' }
						: undefined,
			});
			if (!project) throw new UserError('Project not found');
			await manager.upsert(
				Settings,
				{ key: this.markerKey(projectId), value: 'true', loadOnStartup: false },
				['key'],
			);
		});
	}

	async assertWritable(projectId: string): Promise<void> {
		await this.withWritableProject(projectId, async () => {});
	}

	/** Keep the read lock until the write finishes. Deletion waits for these operations. */
	async withWritableProject<T>(
		projectId: string,
		write: (ctx: OperationContext) => Promise<T>,
		ctx: OperationContext = {},
	): Promise<T> {
		return await this.transactions.run(ctx, async (ctx) => {
			const manager = this.table.managerFor(ctx);
			const project = await manager.findOne(Project, {
				where: { id: projectId },
				lock:
					manager.connection.options.type === 'postgres' ? { mode: 'pessimistic_read' } : undefined,
			});
			if (!project || (await manager.existsBy(Settings, { key: this.markerKey(projectId) })))
				throw new UserError('This project is being deleted. Agent writes are unavailable.');
			return await write(ctx);
		});
	}
}
