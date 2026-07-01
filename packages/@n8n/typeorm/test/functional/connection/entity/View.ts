import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity('view', { synchronize: false })
export class View {
	@PrimaryColumn()
	id: number;

	@Column()
	title: string;
}
