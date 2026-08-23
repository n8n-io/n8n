import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';

@Entity()
export class Post {
	@PrimaryColumn({ name: 'bla_id' })
	lala_id: string;

	@Column()
	title: string;

	@Column({ name: 'my_index' })
	index: number;
}
