import {
	BaseEntity,
	Column,
	Entity,
	PrimaryGeneratedColumn,
	Tree,
	TreeChildren,
	TreeParent,
} from '../../../../src';

@Entity()
@Tree('closure-table')
export class Group extends BaseEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ nullable: false })
	name: string;

	@TreeChildren()
	children: Group;

	@TreeParent()
	parent: Group;
}
