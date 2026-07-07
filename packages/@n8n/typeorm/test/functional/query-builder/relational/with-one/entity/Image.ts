import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { OneToOne } from '../../../../../../src/decorator/relations/OneToOne';
import { Post } from './Post';

@Entity()
export class Image {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	url: string;

	@OneToOne(
		(type) => Post,
		(post) => post.image,
	)
	post: Post;
}
