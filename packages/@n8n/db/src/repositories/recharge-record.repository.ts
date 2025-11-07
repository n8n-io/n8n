import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { RechargeRecord } from '../entities';
import type { RechargeStatus } from '../entities/recharge-record.entity';

/**
 * 充值记录仓储类
 * Repository for managing recharge record operations.
 * Handles balance top-up transactions, status updates, and payment tracking.
 */
@Service()
export class RechargeRecordRepository extends Repository<RechargeRecord> {
	constructor(dataSource: DataSource) {
		super(RechargeRecord, dataSource.manager);
	}

	/**
	 * 创建充值记录
	 * Create and save a recharge record with default 'pending' status.
	 *
	 * @param data - 充值记录部分数据
	 * @returns 创建的充值记录实体
	 */
	async createRecord(data: Partial<RechargeRecord>): Promise<RechargeRecord> {
		const record = this.manager.create(RechargeRecord, {
			...data,
			status: data.status ?? 'pending',
		});
		return await this.manager.save(record);
	}

	/**
	 * 查询指定工作空间的充值记录
	 * Find all recharge records for a specific workspace.
	 *
	 * @param workspaceId - 工作空间ID
	 * @returns 充值记录数组，按创建时间降序排列
	 */
	async findByWorkspace(workspaceId: string): Promise<RechargeRecord[]> {
		return await this.find({
			where: { workspaceId },
			order: {
				createdAt: 'DESC',
			},
		});
	}

	/**
	 * 更新充值状态
	 * Update the status of a recharge record.
	 * When status is set to 'completed', automatically sets the completedAt timestamp.
	 *
	 * @param id - 充值记录ID
	 * @param status - 新的充值状态
	 * @param transactionId - 第三方交易ID（可选）
	 */
	async updateStatus(id: string, status: RechargeStatus, transactionId?: string): Promise<void> {
		const updateData: {
			status: RechargeStatus;
			transactionId?: string;
			completedAt?: Date;
		} = { status };

		if (transactionId) {
			updateData.transactionId = transactionId;
		}

		if (status === 'completed') {
			updateData.completedAt = new Date();
		}

		await this.update(id, updateData);
	}

	/**
	 * 查找待处理的充值记录
	 * Find all recharge records with 'pending' status.
	 * Useful for batch processing or payment verification tasks.
	 *
	 * @returns 状态为'pending'的充值记录数组
	 */
	async findPendingRecords(): Promise<RechargeRecord[]> {
		return await this.find({
			where: { status: 'pending' },
			order: {
				createdAt: 'ASC',
			},
		});
	}
}
