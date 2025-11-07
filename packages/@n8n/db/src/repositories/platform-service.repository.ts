import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { PlatformService } from '../entities';

/**
 * 平台服务仓储类
 * Repository for managing platform service operations.
 * Handles AI models, embedding services, and other platform services with pricing configuration.
 */
@Service()
export class PlatformServiceRepository extends Repository<PlatformService> {
	constructor(dataSource: DataSource) {
		super(PlatformService, dataSource.manager);
	}

	/**
	 * 通过服务标识查询服务
	 * Find a platform service by its service key (primary key).
	 *
	 * @param serviceKey - 服务标识（如：openai-gpt4、anthropic-claude-3.5-sonnet）
	 * @returns 平台服务实体或null
	 */
	async findByServiceKey(serviceKey: string): Promise<PlatformService | null> {
		return await this.findOne({
			where: { serviceKey },
		});
	}

	/**
	 * 查询所有激活的服务
	 * Find all active platform services where isActive is true.
	 *
	 * @returns 激活的平台服务数组
	 */
	async findActiveServices(): Promise<PlatformService[]> {
		return await this.find({
			where: { isActive: true },
			order: {
				serviceType: 'ASC',
				name: 'ASC',
			},
		});
	}

	/**
	 * 按服务类型查询
	 * Find platform services by service type (e.g., 'llm', 'embedding', 'storage').
	 *
	 * @param serviceType - 服务类型（如：llm、embedding、storage等）
	 * @returns 指定类型的平台服务数组
	 */
	async findByType(serviceType: string): Promise<PlatformService[]> {
		return await this.find({
			where: { serviceType },
			order: {
				name: 'ASC',
			},
		});
	}

	/**
	 * 更新服务定价配置
	 * Update the pricing configuration for a specific service.
	 *
	 * @param serviceKey - 服务标识
	 * @param pricingConfig - 新的定价配置（JSON格式）
	 */
	async updatePricing(serviceKey: string, pricingConfig: Record<string, unknown>): Promise<void> {
		const service = await this.findByServiceKey(serviceKey);
		if (service) {
			service.pricingConfig = pricingConfig;
			service.updatedAt = new Date();
			await this.save(service);
		}
	}
}
