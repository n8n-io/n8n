import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { PlatformFeatureConfig } from '../entities';

/**
 * 平台功能配置仓储类
 * Repository for managing platform feature configuration operations.
 * Handles feature toggles and platform-level settings.
 */
@Service()
export class PlatformFeatureConfigRepository extends Repository<PlatformFeatureConfig> {
	constructor(dataSource: DataSource) {
		super(PlatformFeatureConfig, dataSource.manager);
	}

	/**
	 * 通过功能标识查询配置
	 * Find a platform feature configuration by its feature key (unique).
	 *
	 * @param featureKey - 功能标识（如：api_rate_limiting、workspace_quotas）
	 * @returns 功能配置实体或null
	 */
	async findByFeatureKey(featureKey: string): Promise<PlatformFeatureConfig | null> {
		return await this.findOne({
			where: { featureKey },
		});
	}

	/**
	 * 查询所有启用的功能
	 * Find all enabled platform features where enabled is true.
	 *
	 * @returns 启用的功能配置数组
	 */
	async findEnabledFeatures(): Promise<PlatformFeatureConfig[]> {
		return await this.find({
			where: { enabled: true },
			order: {
				featureKey: 'ASC',
			},
		});
	}

	/**
	 * 更新功能状态
	 * Update the enabled status for a specific feature.
	 *
	 * @param featureKey - 功能标识
	 * @param enabled - 是否启用
	 */
	async updateFeatureStatus(featureKey: string, enabled: boolean): Promise<void> {
		const feature = await this.findByFeatureKey(featureKey);
		if (feature) {
			feature.enabled = enabled;
			feature.updatedAt = new Date();
			await this.save(feature);
		}
	}

	/**
	 * 更新功能配置
	 * Update the configuration for a specific feature.
	 *
	 * @param featureKey - 功能标识
	 * @param config - 新的配置（JSON格式）
	 */
	async updateFeatureConfig(featureKey: string, config: Record<string, unknown>): Promise<void> {
		const feature = await this.findByFeatureKey(featureKey);
		if (feature) {
			feature.config = config;
			feature.updatedAt = new Date();
			await this.save(feature);
		}
	}
}
