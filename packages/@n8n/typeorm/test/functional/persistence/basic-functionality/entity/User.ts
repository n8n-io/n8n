import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';

@Entity()
export class User {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	constructor(id: number, name: string) {
		this.id = id;
		this.name = name;
	}
}
