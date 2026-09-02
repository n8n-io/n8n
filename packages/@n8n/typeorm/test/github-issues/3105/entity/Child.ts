import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from '../../../../src';
import { Parent } from './Parent';

@Entity('test_child')
export class Child {
	@PrimaryGeneratedColumn({
		name: 'id',
		type: 'int',
	})
	public id: number;

	@Column({
		name: 'parent_id',
		type: 'int',
	})
	public parentId: number;

	@ManyToOne(
		(type) => Parent,
		(parent) => parent.children,
	)
	@JoinColumn({
		name: 'parent_id',
		referencedColumnName: 'id',
	})
	public parent: Parent;

	@Column({
		name: 'data',
		type: 'int',
	})
	public data: number;

	constructor(_data: number) {
		this.data = _data;
	}
}
