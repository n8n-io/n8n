import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { Post } from './Post';
import { OneToOne } from '../../../../../src/decorator/relations/OneToOne';
import { JoinColumn } from '../../../../../src/decorator/relations/JoinColumn';
import { Details } from './Details';
import { Category } from './Category';

@Entity()
export class Photo {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToOne(
		(type) => Details,
		(details) => details.photo,
	)
	details: Details;

	@OneToOne(
		(type) => Post,
		(post) => post.photo,
		{
			nullable: false,
		},
	)
	@JoinColumn()
	post: Post;

	@OneToOne((type) => Category, {
		nullable: false,
	})
	@JoinColumn()
	category: Category;
}
