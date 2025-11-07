import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { PlatformRagService } from '../entities';

/**
 * 平台RAG服务仓储类
 * Repository for managing platform RAG service operations.
 * Handles domain-specific knowledge base services with pricing and metadata management.
 */
@Service()
export class PlatformRagServiceRepository extends Repository<PlatformRagService> {
	constructor(dataSource: DataSource) {
		super(PlatformRagService, dataSource.manager);
	}

	/**
	 * 通过服务标识查询RAG服务
	 * Find a platform RAG service by its service key (primary key).
	 *
	 * @param serviceKey - 服务标识（如：rag-medical、rag-legal）
	 * @returns 平台RAG服务实体或null
	 */
	async findByServiceKey(serviceKey: string): Promise<PlatformRagService | null> {
		return await this.findOne({
			where: { serviceKey },
		});
	}

	/**
	 * 查询所有激活的RAG服务
	 * Find all active RAG services where isActive is true.
	 *
	 * @returns 激活的平台RAG服务数组
	 */
	async findActiveServices(): Promise<PlatformRagService[]> {
		return await this.find({
			where: { isActive: true },
			order: {
				domain: 'ASC',
				name: 'ASC',
			},
		});
	}

	/**
	 * 按领域查询RAG服务
	 * Find RAG services by domain category (e.g., 'legal', 'medical', 'finance').
	 *
	 * @param domain - 领域类别（如：medical、legal、finance等）
	 * @returns 指定领域的平台RAG服务数组
	 */
	async findByDomain(domain: string): Promise<PlatformRagService[]> {
		return await this.find({
			where: { domain },
			order: {
				name: 'ASC',
			},
		});
	}

	/**
	 * 更新单次查询价格
	 * Update the price per query for a specific RAG service.
	 *
	 * @param serviceKey - 服务标识
	 * @param pricePerQueryCny - 新的单次查询价格（人民币）
	 */
	async updatePrice(serviceKey: string, pricePerQueryCny: number): Promise<void> {
		await this.update(
			{ serviceKey },
			{
				pricePerQueryCny,
				updatedAt: new Date(),
			},
		);
	}
}
