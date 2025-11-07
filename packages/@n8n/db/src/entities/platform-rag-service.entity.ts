import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';

/**
 * 平台RAG服务表
 * Platform RAG service entity for storing domain-specific knowledge base services
 *
 * @example metadata structure:
 * {
 *   "knowledgeBaseSize": 50000,  // Number of documents in knowledge base
 *   "lastUpdated": "2025-01-01",  // Last update date
 *   "coverageYears": "2020-2025",  // Data coverage period
 *   "languages": ["zh-CN"],  // Supported languages
 *   "updateFrequency": "monthly"  // Update frequency
 * }
 */
@Entity()
export class PlatformRagService extends WithTimestamps {
	/**
	 * 服务标识（如：rag-medical、rag-legal等）
	 * Service key (e.g., rag-medical, rag-legal)
	 */
	@PrimaryColumn({ type: 'varchar', length: 100, name: 'service_key' })
	serviceKey: string;

	/**
	 * 服务名称
	 * Service display name
	 */
	@Column({ type: 'varchar', length: 200 })
	name: string;

	/**
	 * 领域类别（如：医疗、法律、金融等）
	 * Domain category (e.g., medical, legal, finance)
	 */
	@Column({ type: 'varchar', length: 50 })
	domain: string;

	/**
	 * 每次查询价格（人民币）
	 * Price per query in CNY
	 */
	@Column({ type: 'double', name: 'price_per_query_cny' })
	pricePerQueryCny: number;

	/**
	 * 元数据（JSON格式，存储知识库详情等）
	 * Metadata in JSON format for knowledge base details
	 */
	@Column({ type: 'json', nullable: true })
	metadata: Record<string, unknown> | null;

	/**
	 * 是否激活
	 * Whether the service is active
	 */
	@Column({ type: 'boolean', default: true, name: 'is_active' })
	isActive: boolean;
}
