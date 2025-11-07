import { Service } from '@n8n/di';
import type { PlatformRagService as PlatformRagServiceEntity } from '@n8n/db';
import { PlatformRagServiceRepository } from '@n8n/db';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

/**
 * RAG 服务未找到错误
 */
export class RagServiceNotFoundError extends NotFoundError {
	constructor(serviceKey: string) {
		super(`RAG service not found: ${serviceKey}`);
	}
}

/**
 * 平台 RAG 知识库服务管理服务
 *
 * 负责管理平台 RAG 知识库服务的配置、定价和查询费用计算
 */
@Service()
export class PlatformRagService {
	constructor(private readonly platformRagServiceRepository: PlatformRagServiceRepository) {}

	/**
	 * 通过服务键获取 RAG 服务
	 *
	 * @param serviceKey - 服务唯一标识键
	 * @returns RAG 服务实体
	 * @throws {RagServiceNotFoundError} 当服务不存在时
	 */
	async getServiceByKey(serviceKey: string): Promise<PlatformRagServiceEntity> {
		const service = await this.platformRagServiceRepository.findOneBy({ serviceKey });

		if (!service) {
			throw new RagServiceNotFoundError(serviceKey);
		}

		return service;
	}

	/**
	 * 获取所有活跃的 RAG 服务
	 *
	 * @returns 活跃的 RAG 服务列表
	 */
	async getActiveServices(): Promise<PlatformRagServiceEntity[]> {
		return await this.platformRagServiceRepository.findBy({ isActive: true });
	}

	/**
	 * 按领域获取 RAG 服务
	 *
	 * @param domain - 领域名称（如 'legal', 'medical', 'finance'）
	 * @returns 指定领域的 RAG 服务列表
	 */
	async getServicesByDomain(domain: string): Promise<PlatformRagServiceEntity[]> {
		return await this.platformRagServiceRepository.findBy({ domain });
	}

	/**
	 * 更新 RAG 服务查询价格
	 *
	 * @param serviceKey - 服务唯一标识键
	 * @param pricePerQueryCny - 单次查询价格（人民币）
	 * @throws {RagServiceNotFoundError} 当服务不存在时
	 */
	async updatePrice(serviceKey: string, pricePerQueryCny: number): Promise<void> {
		const service = await this.getServiceByKey(serviceKey);

		service.pricePerQueryCny = pricePerQueryCny;

		await this.platformRagServiceRepository.save(service);
	}

	/**
	 * 计算查询费用
	 *
	 * 根据查询次数和单次查询价格计算总费用（人民币）
	 *
	 * @param serviceKey - 服务唯一标识键
	 * @param queryCount - 查询次数
	 * @returns 总费用金额（人民币）
	 * @throws {RagServiceNotFoundError} 当服务不存在时
	 */
	async calculateQueryCost(serviceKey: string, queryCount: number): Promise<number> {
		const service = await this.getServiceByKey(serviceKey);

		// 计算费用: 查询次数 * 单次查询价格
		return queryCount * service.pricePerQueryCny;
	}
}
