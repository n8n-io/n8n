import {
	BeforeUpdate,
	Column,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from '@n8n/typeorm';

import { datetimeColumnType } from './abstract-entity';

/**
 * 平台功能配置表
 * Platform feature configuration entity for storing feature toggles and platform-level settings
 * Note: This entity only has updatedAt (no createdAt) as we only care about when the config was last modified
 *
 * @example config structure:
 * {
 *   "rate_limit_per_hour": 1000,  // API rate limiting
 *   "max_api_keys": 5,  // Maximum number of API keys per workspace
 *   "enabled_regions": ["cn-north-1", "cn-east-1"]  // Enabled service regions
 * }
 */
@Entity()
export class PlatformFeatureConfig {
	/**
	 * 主键ID
	 * Primary key ID
	 */
	@PrimaryGeneratedColumn('uuid')
	id: string;

	/**
	 * 功能标识（唯一）
	 * Feature key (unique identifier)
	 */
	@Column({ type: 'varchar', length: 100, unique: true, name: 'feature_key' })
	featureKey: string;

	/**
	 * 是否启用
	 * Whether the feature is enabled
	 */
	@Column({ type: 'boolean', default: false })
	enabled: boolean;

	/**
	 * 配置信息（JSON格式）
	 * Configuration in JSON format
	 */
	@Column({ type: 'json', default: '{}' })
	config: Record<string, unknown>;

	/**
	 * 功能描述
	 * Feature description
	 */
	@Column({ type: 'text', nullable: true })
	description: string | null;

	/**
	 * 更新时间
	 * Last update timestamp
	 */
	@UpdateDateColumn({
		precision: 3,
		type: datetimeColumnType,
		name: 'updated_at',
	})
	updatedAt: Date;

	@BeforeUpdate()
	setUpdateDate(): void {
		this.updatedAt = new Date();
	}
}
