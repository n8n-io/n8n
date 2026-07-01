import { Column } from '../../../../src/decorator/columns/Column';
import { Category } from './Category';

export class Post {
	constructor() {
		this.category = new Category();
	}

	@Column((type) => Category)
	category: Category;

	@Column()
	postNumber: number;
}
