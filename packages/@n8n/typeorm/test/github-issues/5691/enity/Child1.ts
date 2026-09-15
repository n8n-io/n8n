import { Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, RelationId } from '../../../../src';
import { Root } from './Root';
import { Shared } from './Shared';

@Entity()
export class Child1 {
	@PrimaryGeneratedColumn('uuid')
	public id?: string;

	@ManyToOne(
		() => Root,
		(entity) => entity.allChild1,
	)
	public root?: Root;

	@RelationId('root')
	public rootId?: string;

	@OneToMany(
		() => Shared,
		(entity) => entity.child1,
	)
	public allShared?: Array<Shared>;

	@RelationId('allShared')
	public allSharedId?: Array<string>;
}
