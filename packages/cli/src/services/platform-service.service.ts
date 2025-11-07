import { Service } from '@n8n/di';
import type { PlatformService } from '@n8n/db';
import { PlatformServiceRepository } from '@n8n/db';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

/**
 * 平台服务未找到错误
 */
export class ServiceNotFoundError extends NotFoundError {
	constructor(serviceKey: string) {
		super(`Platform service not found: ${serviceKey}`);
	}
}

/**
 * 无效的定价配置错误
 */
export class InvalidPricingConfigError extends Error {
	constructor(serviceKey: string) {
		super(`Invalid pricing config for service: ${serviceKey}`);
	}
}

/**
 * 平台 AI 服务管理服务
 *
 * 负责管理平台 AI 服务（GPT-4、Claude 等）的配置、定价和费用计算
 */
@Service()
export class PlatformServiceService {
	constructor(private readonly platformServiceRepository: PlatformServiceRepository) {}

	/**
	 * 通过服务键获取平台服务
	 *
	 * @param serviceKey - 服务唯一标识键
	 * @returns 平台服务实体
	 * @throws {ServiceNotFoundError} 当服务不存在时
	 */
	async getServiceByKey(serviceKey: string): Promise<PlatformService> {
		const service = await this.platformServiceRepository.findOneBy({ serviceKey });

		if (!service) {
			throw new ServiceNotFoundError(serviceKey);
		}

		return service;
	}

	/**
	 * 获取所有活跃的平台服务
	 *
	 * @returns 活跃的平台服务列表
	 */
	async getActiveServices(): Promise<PlatformService[]> {
		return await this.platformServiceRepository.findBy({ isActive: true });
	}

	/**
	 * 按服务类型获取平台服务
	 *
	 * @param serviceType - 服务类型（如 'llm', 'embedding'）
	 * @returns 指定类型的平台服务列表
	 */
	async getServicesByType(serviceType: string): Promise<PlatformService[]> {
		return await this.platformServiceRepository.findBy({ serviceType });
	}

	/**
	 * 更新服务定价配置
	 *
	 * @param serviceKey - 服务唯一标识键
	 * @param pricingConfig - 定价配置对象
	 * @throws {ServiceNotFoundError} 当服务不存在时
	 */
	async updatePricing(serviceKey: string, pricingConfig: Record<string, unknown>): Promise<void> {
		const service = await this.getServiceByKey(serviceKey);

		service.pricingConfig = pricingConfig;

		await this.platformServiceRepository.save(service);
	}

	/**
	 * 计算服务使用费用
	 *
	 * 根据 token 使用量和服务定价配置计算费用（人民币）
	 *
	 * @param serviceKey - 服务唯一标识键
	 * @param tokensUsed - 使用的 token 数量
	 * @returns 费用金额（人民币）
	 * @throws {ServiceNotFoundError} 当服务不存在时
	 * @throws {InvalidPricingConfigError} 当定价配置无效时
	 */
	async calculateCost(serviceKey: string, tokensUsed: number): Promise<number> {
		const service = await this.getServiceByKey(serviceKey);

		const { pricingConfig } = service;

		if (
			!pricingConfig ||
			typeof pricingConfig !== 'object' ||
			!('pricePerThousandTokens' in pricingConfig)
		) {
			throw new InvalidPricingConfigError(serviceKey);
		}

		const pricePerThousandTokens = Number(pricingConfig.pricePerThousandTokens);

		if (Number.isNaN(pricePerThousandTokens) || pricePerThousandTokens < 0) {
			throw new InvalidPricingConfigError(serviceKey);
		}

		// 计算费用: (使用的 token 数 / 1000) * 千 token 单价
		return (tokensUsed / 1000) * pricePerThousandTokens;
	}
}
