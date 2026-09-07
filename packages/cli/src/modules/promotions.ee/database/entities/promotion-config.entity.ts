import type { PromotionConfigSettings, PromotionDirection } from '@n8n/api-types';
import { JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { PromotionConnection } from './promotion-connection.entity';

/**
 * Settings for one direction of one connection. The generated `id` also names the
 * local checkout directory, so changing a branch keeps the checkout. Deleting and
 * recreating a direction gets a new one.
 */
@Entity('promotion_config')
// One config for each direction. This index also covers lookups by connectionId.
@Index(['connectionId', 'direction'], { unique: true })
export class PromotionConfig extends WithTimestampsAndStringId {
	/** Immutable after creation. */
	@Column({ type: 'varchar', length: 36 })
	connectionId: string;

	/** Defaults to the direction label. Names are not unique. */
	@Column({ type: 'varchar', length: 128 })
	name: string;

	/** Immutable after creation. */
	@Column({ type: 'varchar', length: 16 })
	direction: PromotionDirection;

	/**
	 * Branch settings, with their own `schemaVersion`. Check a loaded row against
	 * the schema for {@link direction} and the provider's type before using it.
	 */
	@JsonColumn()
	settings: PromotionConfigSettings;

	@ManyToOne(() => PromotionConnection, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'connectionId' })
	connection: Relation<PromotionConnection>;
}
