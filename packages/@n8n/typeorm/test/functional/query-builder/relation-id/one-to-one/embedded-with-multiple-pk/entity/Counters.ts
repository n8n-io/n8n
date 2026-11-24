import { Column } from '../../../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../../../src/decorator/columns/PrimaryColumn';
import { OneToOne } from '../../../../../../../src/decorator/relations/OneToOne';
import { JoinColumn } from '../../../../../../../src/decorator/relations/JoinColumn';
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

	@OneToOne((type) => Category)
	@JoinColumn()
	category: Category;

	@Column(() => Subcounters, { prefix: 'sub' })
	subcounters: Subcounters;

	categoryId: number[];
}
