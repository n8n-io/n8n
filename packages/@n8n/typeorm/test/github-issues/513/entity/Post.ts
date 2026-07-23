import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity()
export class Post {
	@PrimaryColumn('int')
	id: number;

	@Column({ type: 'datetime', nullable: true })
	dateTimeColumn: Date;

	@Column({ type: 'time', nullable: true })
	timeColumn: Date;
}
