import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';
import { Post } from './Post';
import { OneToOne } from '../../../../../src/decorator/relations/OneToOne';

@Entity()
export class PostDetails {
	@PrimaryColumn()
	keyword: string;

	@OneToOne(
		(type) => Post,
		(post) => post.details,
		{
			cascade: ['insert'],
		},
	)
	post: Post;
}
