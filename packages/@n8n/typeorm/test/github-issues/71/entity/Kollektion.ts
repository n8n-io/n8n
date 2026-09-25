import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { Generated } from '../../../../src/decorator/Generated';

@Entity('kollektion')
export class Kollektion {
	@PrimaryColumn({ name: 'kollektion_id' })
	@Generated()
	id: number;

	@Column({ name: 'kollektion_name' })
	name: string;
}
