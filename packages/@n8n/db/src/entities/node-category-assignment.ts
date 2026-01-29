import { Entity, ManyToOne, JoinColumn, Relation, Column, Unique, Index } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import { NodeCategory } from './node-category';
import { User } from './user';

@Entity()
@Index(['nodeType'])
@Unique(['categoryId', 'nodeType'])
export class NodeCategoryAssignment extends WithTimestampsAndStringId {
	@Column({ type: String })
	categoryId: string;

	@ManyToOne('NodeCategory', 'nodeAssignments', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'categoryId' })
	category: Relation<NodeCategory>;

	@Column({ type: 'varchar', length: 255 })
	nodeType: string;

	@Column({ type: String, nullable: true })
	assignedById: string | null;

	@ManyToOne('User', { onDelete: 'SET NULL' })
	@JoinColumn({ name: 'assignedById' })
	assignedBy?: Relation<User>;
}
