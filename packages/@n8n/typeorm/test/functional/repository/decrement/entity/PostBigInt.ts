import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';

@Entity()
export class PostBigInt {
	@PrimaryColumn()
	id: number;

	@Column()
	title: string;

	@Column('bigint', {
		unsigned: true,
	})
	counter: string;
}
