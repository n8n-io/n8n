import {
	Entity,
	JoinTable,
	ManyToMany,
	OneToMany,
	PrimaryGeneratedColumn,
	RelationId,
} from '../../../../src';
import { Child1 } from './Child1';
import { Child2 } from './Child2';
import { Shared } from './Shared';

@Entity()
export class Root {
	@PrimaryGeneratedColumn('uuid')
	public id?: string;

	@OneToMany(
		() => Shared,
		(entity) => entity.root,
	)
	public allShared?: Array<Shared>;

	@RelationId('allShared')
	public allSharedId?: Array<string>;

	@OneToMany(
		() => Child1,
		(entity) => entity.root,
	)
	public allChild1?: Array<Child1>;

	@RelationId('allChild1')
	public allChild1Id?: Array<string>;

	@ManyToMany(
		() => Child2,
		(entity) => entity.allRoot,
	)
	@JoinTable()
	public allChild2?: Array<Child2>;

	@RelationId('allChild2')
	public allChild2Id?: Array<string>;
}
