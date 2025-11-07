import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { datetimeColumnType, WithStringId } from './abstract-entity';
import type { Project } from './project';
import type { User } from './user';

/**
 * 使用记录表
 * Usage record entity for tracking service consumption and billing
 * Note: This entity only has createdAt (no updatedAt) as usage records are immutable
 */
@Entity()
@Index(['workspaceId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['serviceKey', 'createdAt'])
export class UsageRecord extends WithStringId {
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
	 * 用户ID
	 * User ID
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
	 * 服务标识（如：openai-gpt4、anthropic-claude等）
	 * Service key (e.g., openai-gpt4, anthropic-claude)
	 */
	@Column({ type: 'varchar', length: 100, name: 'service_key' })
	serviceKey: string;

	/**
	 * 服务类型（如：llm、embedding、storage等）
	 * Service type (e.g., llm, embedding, storage)
	 */
	@Column({ type: 'varchar', length: 50, name: 'service_type' })
	serviceType: string;

	/**
	 * 使用的token数量（可选，仅适用于LLM类服务）
	 * Number of tokens used (optional, only for LLM services)
	 */
	@Column({ type: 'int', nullable: true, name: 'tokens_used' })
	tokensUsed: number | null;

	/**
	 * 调用次数
	 * Number of API calls
	 */
	@Column({ type: 'int', default: 1, name: 'calls_count' })
	callsCount: number;

	/**
	 * 消费金额（人民币）
	 * Amount consumed in CNY
	 */
	@Column({ type: 'double', name: 'amount_cny' })
	amountCny: number;

	/**
	 * 元数据（JSON格式，存储额外信息）
	 * Metadata in JSON format for additional information
	 */
	@Column({ type: 'json', nullable: true })
	metadata: Record<string, unknown> | null;

	/**
	 * 创建时间（记录消费发生时间）
	 * Creation timestamp (when the usage occurred)
	 */
	@CreateDateColumn({
		precision: 3,
		type: datetimeColumnType,
		name: 'created_at',
	})
	createdAt: Date;
}
