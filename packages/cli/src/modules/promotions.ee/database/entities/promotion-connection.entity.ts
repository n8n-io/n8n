import type { PromotionConnectionScope, PromotionConnectionTarget } from '@n8n/api-types';
import { JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { PromotionProvider } from './promotion-provider.entity';

/**
 * One remote, reached with one provider's credentials. The provider, remote URL,
 * and name are not unique, because a provider can serve several connections.
 */
@Entity('promotion_connection')
// Only one instance connection is allowed, but any number of project ones.
@Index(['scope'], { unique: true, where: '"scope" = \'instance\'' })
export class PromotionConnection extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	providerId: string;

	/**
	 * Cannot change after creation. A change would quietly move the instance
	 * fallback or break existing project links. Create a new connection instead.
	 */
	@Column({ type: 'varchar', length: 16 })
	scope: PromotionConnectionScope;

	/** Where to push and pull, with its own `schemaVersion`. */
	@JsonColumn()
	target: PromotionConnectionTarget;

	@ManyToOne(() => PromotionProvider, { onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'providerId' })
	provider: Relation<PromotionProvider>;
}
