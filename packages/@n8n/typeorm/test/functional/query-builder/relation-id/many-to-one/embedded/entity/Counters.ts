import { Column } from '../../../../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../../../../src/decorator/relations/ManyToOne';
import { Category } from './Category';
import { Subcounters } from './Subcounters';

export class Counters {
	@Column()
	likes: number;

	@Column()
	comments: number;

	@Column()
	favorites: number;

	@ManyToOne(
		(type) => Category,
		(category) => category.posts,
	)
	category: Category;

	@Column(() => Subcounters, { prefix: 'sub' })
	subcounters: Subcounters;

	categoryId: number;
}
