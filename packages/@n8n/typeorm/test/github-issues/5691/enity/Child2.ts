import { ManyToMany, PrimaryGeneratedColumn, RelationId, OneToMany, Entity } from '../../../../src';
import { Root } from './Root';
import { Shared } from './Shared';

@Entity()
export class Child2 {
	@PrimaryGeneratedColumn('uuid')
	public id?: string;

	@ManyToMany(
		() => Root,
		(entity) => entity.allChild2,
	)
	public allRoot?: Root;

	@RelationId('allRoot')
	public allRootId?: Array<string>;

	@OneToMany(
		() => Shared,
		(entity) => entity.child2,
	)
	public allShared?: Array<Shared>;

	@RelationId('allShared')
	public allSharedId?: Array<string>;
}
