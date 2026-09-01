import { Column } from '../../../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../../../src/decorator/columns/PrimaryColumn';
import { ManyToOne } from '../../../../../../../src/decorator/relations/ManyToOne';
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

	@ManyToOne((type) => Category)
	category: Category;

	@Column(() => Subcounters, { prefix: 'sub' })
	subcounters: Subcounters;

	categoryId: number[];
}
