import type { PromotionConfigSettings, PromotionDirection } from '@n8n/api-types';
import { JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { PromotionConnection } from './promotion-connection.entity';

/**
 * Settings for one direction of one connection. The generated `id` also names the
 * local checkout directory.
 */
@Entity('promotion_config')
// One config for each direction. This index also covers lookups by connectionId.
@Index(['connectionId', 'direction'], { unique: true })
export class PromotionConfig extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	connectionId: string;

	/** Names are not unique. */
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'varchar', length: 16 })
	direction: PromotionDirection;

	/** Branch settings for {@link direction}, with their own `schemaVersion`. */
	@JsonColumn()
	settings: PromotionConfigSettings;

	@ManyToOne(() => PromotionConnection, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'connectionId' })
	connection: Relation<PromotionConnection>;
}
