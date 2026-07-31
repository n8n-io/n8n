import { JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity } from '@n8n/typeorm';

export type PromotionRole = 'source' | 'destination';

/** Model-specific data; each promotion model owns the shape of what it stores here. */
export type PromotionMetadata = Record<string, unknown>;

@Entity({ name: 'promotion' })
export class Promotion extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 64 })
	model: string;

	@Column({ type: 'varchar', length: 16 })
	role: PromotionRole;

	@Column({ type: 'varchar', length: 32 })
	unitOfWorkType: string;

	@Column({ type: 'varchar', length: 36 })
	unitOfWorkId: string;

	/** Lifecycle state; the vocabulary is owned by the promotion model. */
	@Column({ type: 'varchar', length: 64 })
	state: string;

	@JsonColumn()
	metadata: PromotionMetadata;
}
