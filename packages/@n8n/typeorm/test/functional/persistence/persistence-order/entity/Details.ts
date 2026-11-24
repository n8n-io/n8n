import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { OneToOne } from '../../../../../src/decorator/relations/OneToOne';
import { Post } from './Post';
import { Photo } from './Photo';
import { JoinColumn } from '../../../../../src/decorator/relations/JoinColumn';

@Entity()
export class Details {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@OneToOne(
		(type) => Post,
		(post) => post.details,
	)
	post: Post;

	@OneToOne(
		(type) => Photo,
		(photo) => photo.details,
		{
			nullable: false,
		},
	)
	@JoinColumn()
	photo: Photo;
}
