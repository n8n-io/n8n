import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../src/decorator/entity/Entity';

@Entity()
export class Post {
	@PrimaryColumn()
	id: number;

	constructor(id: number) {
		this.id = id;
	}
}
