import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../src/decorator/entity/Entity';

@Entity()
export class Username {
	@PrimaryColumn()
	username: string;

	@Column()
	email: string;
}
