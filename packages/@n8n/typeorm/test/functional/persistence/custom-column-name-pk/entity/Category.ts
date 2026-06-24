import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { Post } from './Post';
import { OneToMany } from '../../../../../src/decorator/relations/OneToMany';
import { Generated } from '../../../../../src/decorator/Generated';

@Entity()
export class Category {
	@PrimaryColumn({ name: 'theId' })
	@Generated()
	id: number;

	@Column()
	name: string;

	@OneToMany(
		(type) => Post,
		(post) => post.category,
		{
			cascade: ['insert'],
		},
	)
	posts: Post[];
}
