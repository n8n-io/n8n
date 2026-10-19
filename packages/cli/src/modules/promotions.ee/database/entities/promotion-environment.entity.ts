import type {
	PromotionDirection,
	PromotionEnvironmentScope,
	PromotionEnvironmentSettings,
} from '@n8n/api-types';
import { JsonColumn, WithTimestamps } from '@n8n/db';
import {
	BeforeInsert,
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';
import { v7 as uuidv7 } from 'uuid';

import { PromotionProvider } from './promotion-provider.entity';
import type { PromotionStoredConnectionTarget } from '../../git-hosts/git-host-target';

/**
 * One direction against one remote, reached with one provider's credentials. The
 * provider, remote URL, and name are not unique, because a provider can serve
 * several environments. The `id` also names the local checkout directory.
 */
@Entity('promotion_environment')
// One instance environment for each direction, but any number of project ones.
@Index(['direction'], { unique: true, where: '"scope" = \'instance\'' })
export class PromotionEnvironment extends WithTimestamps {
	@PrimaryColumn({ type: 'uuid' })
	id: string;

	@BeforeInsert()
	generateId() {
		if (!this.id) this.id = uuidv7();
	}

	/** Names are not unique. */
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	providerId: string;

	/** Cannot change after creation. Create a new environment instead. */
	@Column({ type: 'varchar', length: 16 })
	direction: PromotionDirection;

	/**
	 * Cannot change after creation. A change would quietly move the instance
	 * fallback or break existing project links. Create a new environment instead.
	 */
	@Column({ type: 'varchar', length: 16 })
	scope: PromotionEnvironmentScope;

	/** Where to push and pull, with its own `schemaVersion`. */
	@JsonColumn()
	target: PromotionStoredConnectionTarget;

	/** Branch settings for {@link direction}, with their own `schemaVersion`. */
	@JsonColumn()
	settings: PromotionEnvironmentSettings;

	@ManyToOne(() => PromotionProvider, { onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'providerId' })
	provider: Relation<PromotionProvider>;
}
