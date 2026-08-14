import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../../../src/decorator/columns/PrimaryColumn';
import { Column } from '../../../../../../src/decorator/columns/Column';

@Entity()
export class PostWithoutTypes {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	@Column()
	bit: boolean;

	@Column()
	datetime: Date;
}
