import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

/** Exactly one of `parentNodeType` and `customNodeId` is set. A CHECK constraint enforces it. */
@Entity({ name: 'custom_action' })
@Index(['customNodeId'])
@Index(['parentNodeType'])
@Index(['createdById'])
@Index(['updatedById'])
export class CustomActionEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'text', nullable: true })
	description: string | null;

	@Column({ type: 'varchar', length: 255, nullable: true })
	parentNodeType: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	customNodeId: string | null;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	@Column({ type: 'uuid', nullable: true })
	updatedById: string | null;
}
