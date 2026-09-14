import {
	Entity,
	JoinColumn,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
	RelationId,
} from '../../../../src';
import { Child1 } from './Child1';
import { Child2 } from './Child2';
import { Root } from './Root';

@Entity()
export class Shared {
	@PrimaryGeneratedColumn('uuid')
	public id?: string;

	@ManyToOne(
		() => Root,
		(entity) => entity.allShared,
	)
	@JoinColumn()
	public root?: Root;

	@RelationId('root')
	public rootId?: string;

	@ManyToOne(
		() => Child1,
		(entity) => entity.allShared,
	)
	@JoinColumn()
	public child1?: Child1;

	@RelationId('child1')
	public child1Id?: string;

	@ManyToOne(
		() => Child2,
		(entity) => entity.allShared,
	)
	@JoinColumn()
	public child2?: Child2;

	@RelationId('child2')
	public child2Id?: string;

	@ManyToOne(
		() => Shared,
		(entity) => entity.allShared,
	)
	@JoinColumn()
	public shared?: Shared;

	@RelationId('shared')
	public sharedId?: string;

	@OneToMany(
		() => Shared,
		(entity) => entity.shared,
	)
	public allShared?: Array<Shared>;

	@RelationId('allShared')
	public allSharedId?: Array<string>;
}
