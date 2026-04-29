import { Column, Entity, ManyToOne, OneToMany, JoinColumn, Relation, Unique } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import type { NodeCategoryAssignment } from './node-category-assignment';
import { User } from './user';

@Entity()
@Unique(['slug'])
export class NodeCategory extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 100 })
	slug: string;

	@Column({ type: 'varchar', length: 255 })
	displayName: string;

	@Column({ type: 'text', nullable: true })
	description: string | null;

	@Column({ type: 'varchar', length: 7, nullable: true })
	color: string | null;

	@Column({ type: String, nullable: true })
	createdById: string | null;

	@ManyToOne('User', { onDelete: 'SET NULL' })
	@JoinColumn({ name: 'createdById' })
	createdBy?: Relation<User>;

	@OneToMany('NodeCategoryAssignment', 'category')
	nodeAssignments: NodeCategoryAssignment[];
}
