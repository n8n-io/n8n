import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { PollerState } from '../entities';
import { BaseRepository } from './base-repository';
import type { OperationContext } from '../services/transaction';

export type PollerCursor = Record<string, unknown>;

@Service()
export class PollerStateRepository extends BaseRepository<PollerState> {
	constructor(dataSource: DataSource) {
		super(PollerState, dataSource.manager);
	}

	async findCursor(
		workflowId: string,
		nodeId: string,
		ctx: OperationContext = {},
	): Promise<PollerCursor | null> {
		const row = await this.managerFor(ctx).findOne(PollerState, {
			select: ['cursor'],
			where: { workflowId, nodeId },
		});
		return row === null ? null : row.cursor;
	}
}
