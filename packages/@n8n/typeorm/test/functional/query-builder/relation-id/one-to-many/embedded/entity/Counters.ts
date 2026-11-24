import { Column } from '../../../../../../../src/decorator/columns/Column';
import { Category } from './Category';
import { Subcounters } from './Subcounters';
import { OneToMany } from '../../../../../../../src/decorator/relations/OneToMany';

export class Counters {
	@Column()
	likes: number;

	@Column()
	comments: number;

	@Column()
	favorites: number;

	@OneToMany(
		(type) => Category,
		(category) => category.posts,
	)
	categories: Category[];

	@Column(() => Subcounters, { prefix: 'sub' })
	subcounters: Subcounters;

	categoryIds: number[];
}
