import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../../src/decorator/relations/ManyToOne';
import { Post } from './Post';

@Entity()
export class Category {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	@ManyToOne(
		(type) => Post,
		(post) => post.categories,
		{
			cascade: true,
			onDelete: 'SET NULL',
		},
	)
	post?: Post | null | number;

	constructor(id: number, name: string, post?: Post) {
		this.id = id;
		this.name = name;
		if (post) this.post = post;
	}
}
