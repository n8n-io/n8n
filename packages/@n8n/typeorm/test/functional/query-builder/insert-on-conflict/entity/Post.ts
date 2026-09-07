import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { Unique } from '../../../../../src/decorator/Unique';
import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';

@Entity()
@Unique(['date'])
export class Post {
	@PrimaryColumn()
	id: string;

	@Column()
	title: string;

	@Column()
	date: Date;
}
