import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import type { Project } from './project';

/**
 * 工作空间余额表
 * Workspace balance entity for storing balance information and low balance threshold for each workspace
 */
@Entity()
export class WorkspaceBalance extends WithTimestampsAndStringId {
	/**
	 * 工作空间ID（关联到Project表）
	 * Workspace ID (linked to Project table)
	 */
	@Column({ type: 'varchar', length: 36, name: 'workspace_id' })
	@Index({ unique: true })
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
	 * 余额（人民币）
	 * Balance in CNY
	 */
	@Column({ type: 'double', default: 0.0, name: 'balance_cny' })
	balanceCny: number;

	/**
	 * 低余额阈值（人民币）
	 * Low balance threshold in CNY
	 */
	@Column({ type: 'double', default: 10.0, name: 'low_balance_threshold_cny' })
	lowBalanceThresholdCny: number;

	/**
	 * 货币类型
	 * Currency type
	 */
	@Column({ type: 'varchar', length: 3, default: 'CNY' })
	currency: string;
}
