import { Column } from '../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../src/decorator/entity/Entity';

@Entity()
export class Category {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	constructor(id: number, name: string) {
		this.id = id;
		this.name = name;
	}
}
