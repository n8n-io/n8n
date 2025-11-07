import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { DateTimeColumn, WithTimestampsAndStringId } from './abstract-entity';
import type { Project } from './project';
import type { User } from './user';

/**
 * 充值状态类型
 * Recharge status type
 */
export type RechargeStatus = 'pending' | 'completed' | 'failed';

/**
 * 充值记录表
 * Recharge record entity for tracking balance top-ups and payment transactions
 */
@Entity()
@Index(['workspaceId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['status'])
export class RechargeRecord extends WithTimestampsAndStringId {
	/**
	 * 工作空间ID
	 * Workspace ID
	 */
	@Column({ type: 'varchar', length: 36, name: 'workspace_id' })
	workspaceId: string;

	/**
	 * 关联的工作空间
	 * Associated workspace
	 */
	@ManyToOne('Project', {
		onDelete: 'CASCADE',
		nullable: false,
	})
	@JoinColumn({ name: 'workspace_id' })
	workspace: Project;

	/**
	 * 用户ID（充值操作人）
	 * User ID (who performed the recharge)
	 */
	@Column({ type: 'varchar', length: 36, name: 'user_id' })
	userId: string;

	/**
	 * 关联的用户
	 * Associated user
	 */
	@ManyToOne('User', {
		onDelete: 'CASCADE',
		nullable: false,
	})
	@JoinColumn({ name: 'user_id' })
	user: User;

	/**
	 * 充值金额（人民币）
	 * Recharge amount in CNY
	 */
	@Column({ type: 'double', name: 'amount_cny' })
	amountCny: number;

	/**
	 * 支付方式（如：alipay、wechat、bank_transfer等）
	 * Payment method (e.g., alipay, wechat, bank_transfer)
	 */
	@Column({ type: 'varchar', length: 50, name: 'payment_method' })
	paymentMethod: string;

	/**
	 * 第三方交易ID（可选）
	 * Third-party transaction ID (optional)
	 */
	@Column({ type: 'varchar', length: 200, nullable: true, name: 'transaction_id' })
	transactionId: string | null;

	/**
	 * 充值状态：pending-待处理、completed-已完成、failed-失败
	 * Recharge status: pending, completed, or failed
	 */
	@Column({ type: 'varchar', length: 20, default: 'pending' })
	status: RechargeStatus;

	/**
	 * 完成时间（充值成功的时间）
	 * Completion timestamp (when recharge succeeded)
	 */
	@DateTimeColumn({ nullable: true, name: 'completed_at' })
	completedAt: Date | null;
}
