import { Column } from '../../../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../../../src/decorator/columns/PrimaryColumn';
import { OneToMany } from '../../../../../../../src/decorator/relations/OneToMany';
import { Category } from './Category';
import { Subcounters } from './Subcounters';

export class Counters {
	@PrimaryColumn()
	code: number;

	@Column()
	likes: number;

	@Column()
	comments: number;

	@Column()
	favorites: number;

	@OneToMany(
		(type) => Category,
		(category) => category.post,
	)
	categories: Category[];

	@Column(() => Subcounters, { prefix: 'sub' })
	subcounters: Subcounters;

	categoryIds: any[];
}
