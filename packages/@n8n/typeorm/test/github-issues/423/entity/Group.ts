import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { Index } from '../../../../src/decorator/Index';

@Index('Groups name', ['name'], { unique: true })
@Entity('groups')
export class Group {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;
}
