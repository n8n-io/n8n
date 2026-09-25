import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from '../../../../src';
import { Grandchild } from './Grandchild';
import { Parent } from './Parent';

@Entity()
export class Child {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name?: string;

	@ManyToOne(
		() => Parent,
		(parent) => parent.children,
	)
	parent?: Parent;

	@OneToMany(
		() => Grandchild,
		(grandchild) => grandchild.parent,
	)
	children?: Grandchild[];
}
