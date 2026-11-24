import { Column } from '../../../../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../../../../src/decorator/relations/JoinTable';
import { Category } from './Category';
import { Subcounters } from './Subcounters';

export class Counters {
	@Column()
	likes: number;

	@Column()
	comments: number;

	@Column()
	favorites: number;

	@ManyToMany(
		(type) => Category,
		(category) => category.posts,
	)
	@JoinTable({ name: 'counter_categories' })
	categories: Category[];

	@Column(() => Subcounters, { prefix: 'subcnt' })
	subcounters: Subcounters;

	categoryIds: number[];
}
