import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { UsageRecord } from '../entities';

/**
 * 使用记录仓储类
 * Repository for managing usage record operations.
 * Handles tracking service consumption, billing records, and usage statistics.
 */
@Service()
export class UsageRecordRepository extends Repository<UsageRecord> {
	constructor(dataSource: DataSource) {
		super(UsageRecord, dataSource.manager);
	}

	/**
	 * 创建使用记录
	 * Create and save a usage record.
	 * Usage records are immutable - once created, they cannot be modified.
	 *
	 * @param data - 使用记录部分数据
	 * @returns 创建的使用记录实体
	 */
	async createRecord(data: Partial<UsageRecord>): Promise<UsageRecord> {
		const record = this.manager.create(UsageRecord, data);
		return await this.manager.save(record);
	}

	/**
	 * 查询指定工作空间的使用记录
	 * Find usage records for a specific workspace with optional date range filtering.
	 *
	 * @param workspaceId - 工作空间ID
	 * @param startDate - 开始日期（可选）
	 * @param endDate - 结束日期（可选）
	 * @returns 使用记录数组，按创建时间降序排列
	 */
	async findByWorkspace(
		workspaceId: string,
		startDate?: Date,
		endDate?: Date,
	): Promise<UsageRecord[]> {
		const query = this.createQueryBuilder('usage_record').where(
			'usage_record.workspaceId = :workspaceId',
			{ workspaceId },
		);

		if (startDate && endDate) {
			query.andWhere('usage_record.createdAt BETWEEN :startDate AND :endDate', {
				startDate,
				endDate,
			});
		}

		return await query.orderBy('usage_record.createdAt', 'DESC').getMany();
	}

	/**
	 * 查询指定用户的使用记录
	 * Find usage records for a specific user with optional date range filtering.
	 *
	 * @param userId - 用户ID
	 * @param startDate - 开始日期（可选）
	 * @param endDate - 结束日期（可选）
	 * @returns 使用记录数组，按创建时间降序排列
	 */
	async findByUser(userId: string, startDate?: Date, endDate?: Date): Promise<UsageRecord[]> {
		const query = this.createQueryBuilder('usage_record').where('usage_record.userId = :userId', {
			userId,
		});

		if (startDate && endDate) {
			query.andWhere('usage_record.createdAt BETWEEN :startDate AND :endDate', {
				startDate,
				endDate,
			});
		}

		return await query.orderBy('usage_record.createdAt', 'DESC').getMany();
	}

	/**
	 * 获取工作空间使用统计
	 * Get aggregated usage statistics for a workspace within a specified time range.
	 * Uses QueryBuilder for efficient aggregation queries.
	 *
	 * @param workspaceId - 工作空间ID
	 * @param startDate - 开始日期
	 * @param endDate - 结束日期
	 * @returns 包含总金额、总token数和记录数的统计对象
	 */
	async getWorkspaceUsageStats(
		workspaceId: string,
		startDate: Date,
		endDate: Date,
	): Promise<{ totalAmount: number; totalTokens: number; recordCount: number }> {
		const result = await this.createQueryBuilder('usage_record')
			.select('SUM(usage_record.amountCny)', 'totalAmount')
			.addSelect('SUM(usage_record.tokensUsed)', 'totalTokens')
			.addSelect('COUNT(*)', 'recordCount')
			.where('usage_record.workspaceId = :workspaceId', { workspaceId })
			.andWhere('usage_record.createdAt BETWEEN :startDate AND :endDate', {
				startDate,
				endDate,
			})
			.getRawOne<{
				totalAmount: string | null;
				totalTokens: string | null;
				recordCount: string;
			}>();

		return {
			totalAmount: result?.totalAmount ? parseFloat(result.totalAmount) : 0,
			totalTokens: result?.totalTokens ? parseFloat(result.totalTokens) : 0,
			recordCount: result?.recordCount ? parseInt(result.recordCount, 10) : 0,
		};
	}
}
