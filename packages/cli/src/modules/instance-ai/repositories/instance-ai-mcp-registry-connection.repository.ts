import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { InstanceAiMcpRegistryConnection } from '../entities/instance-ai-mcp-registry-connection.entity';

class InstanceAiMcpRegistryConnectionTable extends BaseRepository<InstanceAiMcpRegistryConnection> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(InstanceAiMcpRegistryConnection, dataSource.manager, transactionRunner);
	}
}

@Service()
export class InstanceAiMcpRegistryConnectionRepository {
	private readonly table: InstanceAiMcpRegistryConnectionTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new InstanceAiMcpRegistryConnectionTable(dataSource, transactionRunner);
	}

	async findByUserId(userId: string, ctx: OperationContext) {
		return await this.table.managerFor(ctx).findBy(InstanceAiMcpRegistryConnection, { userId });
	}

	async findByUserIdAndServerSlug(userId: string, serverSlug: string, ctx: OperationContext) {
		return await this.table
			.managerFor(ctx)
			.findOneBy(InstanceAiMcpRegistryConnection, { userId, serverSlug });
	}

	async findByIdAndUserId(id: string, userId: string, ctx: OperationContext) {
		return await this.table
			.managerFor(ctx)
			.findOneBy(InstanceAiMcpRegistryConnection, { id, userId });
	}

	async createConnection(
		values: Pick<
			InstanceAiMcpRegistryConnection,
			'id' | 'userId' | 'serverSlug' | 'credentialId' | 'toolPermissions'
		>,
		ctx: OperationContext,
	) {
		const manager = this.table.managerFor(ctx);
		const connection = manager.create(InstanceAiMcpRegistryConnection, values);
		return await manager.save(InstanceAiMcpRegistryConnection, connection);
	}

	async saveConnectionChanges(connection: InstanceAiMcpRegistryConnection, ctx: OperationContext) {
		return await this.table.managerFor(ctx).save(InstanceAiMcpRegistryConnection, connection);
	}

	async deleteById(id: string, ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).delete(InstanceAiMcpRegistryConnection, { id });
	}

	async deleteByUserId(userId: string, ctx: OperationContext): Promise<number> {
		const result = await this.table
			.managerFor(ctx)
			.delete(InstanceAiMcpRegistryConnection, { userId });
		return result.affected ?? 0;
	}
}
