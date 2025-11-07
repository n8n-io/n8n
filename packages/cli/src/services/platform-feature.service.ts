import { Service } from '@n8n/di';
import type { PlatformFeatureConfig } from '@n8n/db';
import { PlatformFeatureConfigRepository } from '@n8n/db';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

/**
 * 功能配置未找到错误
 */
export class FeatureNotFoundError extends NotFoundError {
	constructor(featureKey: string) {
		super(`Feature not found: ${featureKey}`);
	}
}

/**
 * 平台功能配置管理服务
 *
 * 负责管理平台功能的开关状态和配置信息
 */
@Service()
export class PlatformFeatureService {
	constructor(private readonly platformFeatureConfigRepository: PlatformFeatureConfigRepository) {}

	/**
	 * 通过功能键获取功能配置
	 *
	 * @param featureKey - 功能唯一标识键
	 * @returns 功能配置实体
	 * @throws {FeatureNotFoundError} 当功能配置不存在时
	 */
	async getFeatureByKey(featureKey: string): Promise<PlatformFeatureConfig> {
		const feature = await this.platformFeatureConfigRepository.findOneBy({ featureKey });

		if (!feature) {
			throw new FeatureNotFoundError(featureKey);
		}

		return feature;
	}

	/**
	 * 获取所有功能配置
	 *
	 * @returns 所有功能配置列表
	 */
	async getAllFeatures(): Promise<PlatformFeatureConfig[]> {
		return await this.platformFeatureConfigRepository.find();
	}

	/**
	 * 检查功能是否启用
	 *
	 * @param featureKey - 功能唯一标识键
	 * @returns 功能是否启用
	 * @throws {FeatureNotFoundError} 当功能配置不存在时
	 */
	async isFeatureEnabled(featureKey: string): Promise<boolean> {
		const feature = await this.getFeatureByKey(featureKey);
		return feature.enabled;
	}

	/**
	 * 更新功能配置
	 *
	 * 更新功能的启用状态和配置信息，如果提供了新配置则与现有配置合并
	 *
	 * @param featureKey - 功能唯一标识键
	 * @param enabled - 功能启用状态
	 * @param config - 功能配置对象（可选）
	 * @throws {FeatureNotFoundError} 当功能配置不存在时
	 */
	async updateFeature(
		featureKey: string,
		enabled: boolean,
		config?: Record<string, unknown>,
	): Promise<void> {
		const feature = await this.getFeatureByKey(featureKey);

		feature.enabled = enabled;

		// 如果提供了新配置，合并到现有配置
		if (config) {
			feature.config = {
				...(feature.config || {}),
				...config,
			};
		}

		await this.platformFeatureConfigRepository.save(feature);
	}

	/**
	 * 获取功能的配置对象
	 *
	 * @param featureKey - 功能唯一标识键
	 * @returns 功能配置对象
	 * @throws {FeatureNotFoundError} 当功能配置不存在时
	 */
	async getFeatureConfig(featureKey: string): Promise<Record<string, unknown>> {
		const feature = await this.getFeatureByKey(featureKey);
		return feature.config || {};
	}
}
