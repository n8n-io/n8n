import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';

/**
 * 平台服务表
 * Platform service entity for storing AI models and other services with pricing configuration
 *
 * @example pricingConfig structure:
 * {
 *   "pricePerToken": 0.00001,  // Price per token for AI models (CNY)
 *   "currency": "CNY",
 *   "inputTokenPrice": 0.00001,  // Optional: different price for input tokens
 *   "outputTokenPrice": 0.00003  // Optional: different price for output tokens
 * }
 */
@Entity()
export class PlatformService extends WithTimestamps {
	/**
	 * 服务标识（如：openai-gpt4、anthropic-claude-3.5-sonnet）
	 * Service key (e.g., openai-gpt4, anthropic-claude-3.5-sonnet)
	 */
	@PrimaryColumn({ type: 'varchar', length: 100, name: 'service_key' })
	serviceKey: string;

	/**
	 * 服务类型（如：llm、embedding、storage等）
	 * Service type (e.g., llm, embedding, storage)
	 */
	@Column({ type: 'varchar', length: 50, name: 'service_type' })
	serviceType: string;

	/**
	 * 服务名称
	 * Service display name
	 */
	@Column({ type: 'varchar', length: 200 })
	name: string;

	/**
	 * 定价配置（JSON格式）
	 * Pricing configuration in JSON format
	 */
	@Column({ type: 'json', name: 'pricing_config' })
	pricingConfig: Record<string, unknown>;

	/**
	 * 是否激活
	 * Whether the service is active
	 */
	@Column({ type: 'boolean', default: true, name: 'is_active' })
	isActive: boolean;
}
