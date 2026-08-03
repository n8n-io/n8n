import { Column } from '../../../../src/decorator/columns/Column';
import { Post } from './Post';

export class Group {
	constructor() {
		this.post = new Post();
	}

	@Column((type) => Post)
	post: Post;

	@Column()
	groupNumber: number;
}
