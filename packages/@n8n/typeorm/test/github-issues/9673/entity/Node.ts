import {
	TreeChildren,
	TreeParent,
	OneToMany,
	Entity,
	PrimaryGeneratedColumn,
	DeleteDateColumn,
	Column,
	Tree,
	JoinColumn,
} from '../../../../src';
import { Rule } from './Rule';

@Entity('node')
@Tree('materialized-path')
export class Node {
	@PrimaryGeneratedColumn({ type: 'int' })
	id?: number;

	@DeleteDateColumn()
	deletedAt?: Date;

	@OneToMany(
		() => Rule,
		(rule) => rule.node,
		{
			cascade: true,
			onDelete: 'CASCADE',
		},
	)
	rules?: Rule[];

	@Column('varchar')
	name!: string;

	@TreeChildren({ cascade: true })
	children?: Node[];

	@Column({ type: 'int', nullable: true, name: 'parentId' })
	parentId?: number;

	@TreeParent()
	@JoinColumn({
		name: 'parentId',
		referencedColumnName: 'id',
	})
	parent?: Node;
}
