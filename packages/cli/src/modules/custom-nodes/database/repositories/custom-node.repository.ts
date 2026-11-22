import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { generateCustomNodeId } from '../../custom-node-id';
import { CustomNodeEntity, type CustomNodeIconMimeType } from '../entities/custom-node.entity';

class CustomNodeTable extends BaseRepository<CustomNodeEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(CustomNodeEntity, dataSource.manager, transactionRunner);
	}
}

/** The fields a caller supplies to insert a custom node. The repository makes the id. */
export type NewCustomNode = Pick<CustomNodeEntity, 'displayName' | 'baseUrl' | 'auth'> &
	Partial<Pick<CustomNodeEntity, 'description' | 'createdById'>>;

export type CustomNodePatch = Partial<
	Pick<
		CustomNodeEntity,
		'displayName' | 'description' | 'baseUrl' | 'baseUrlHistory' | 'updatedById'
	>
>;

export interface CustomNodeIcon {
	mimeType: CustomNodeIconMimeType;
	data: Buffer;
}

@Service()
export class CustomNodeRepository {
	private readonly table: CustomNodeTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new CustomNodeTable(dataSource, transactionRunner);
	}

	async insertNode(node: NewCustomNode, ctx: OperationContext): Promise<CustomNodeEntity> {
		const manager = this.table.managerFor(ctx);
		const id = generateCustomNodeId();
		await manager.insert(CustomNodeEntity, {
			id,
			displayName: node.displayName,
			description: node.description ?? null,
			baseUrl: node.baseUrl,
			baseUrlHistory: [],
			auth: node.auth,
			createdById: node.createdById ?? null,
			updatedById: node.createdById ?? null,
		});
		return await manager.findOneByOrFail(CustomNodeEntity, { id });
	}

	/** Does not load `iconData`. `iconMimeType` tells whether the node has an icon. */
	async findAllNodes(ctx: OperationContext): Promise<CustomNodeEntity[]> {
		return await this.table
			.managerFor(ctx)
			.find(CustomNodeEntity, { order: { createdAt: 'ASC', id: 'ASC' } });
	}

	/** Does not load `iconData`. Use `findIcon` for it. */
	async findNode(id: string, ctx: OperationContext): Promise<CustomNodeEntity | null> {
		return await this.table.managerFor(ctx).findOneBy(CustomNodeEntity, { id });
	}

	async updateNode(id: string, patch: CustomNodePatch, ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).update(CustomNodeEntity, { id }, patch);
	}

	/** Pass `null` to remove the icon. */
	async setIcon(id: string, icon: CustomNodeIcon | null, ctx: OperationContext): Promise<void> {
		await this.table
			.managerFor(ctx)
			.update(
				CustomNodeEntity,
				{ id },
				{ iconMimeType: icon?.mimeType ?? null, iconData: icon?.data ?? null },
			);
	}

	async findIcon(id: string, ctx: OperationContext): Promise<CustomNodeIcon | null> {
		const row = await this.table.managerFor(ctx).findOne(CustomNodeEntity, {
			select: { id: true, iconMimeType: true, iconData: true },
			where: { id },
		});
		if (!row?.iconMimeType || !row.iconData) return null;
		return { mimeType: row.iconMimeType, data: row.iconData };
	}

	/** The database deletes the actions, versions and revisions of the node (CASCADE). */
	async deleteNode(id: string, ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).delete(CustomNodeEntity, { id });
	}
}
