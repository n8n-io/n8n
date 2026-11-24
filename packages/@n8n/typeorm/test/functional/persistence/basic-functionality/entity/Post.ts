import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';

@Entity()
export class Post {
	@PrimaryColumn()
	id: number;

	@Column()
	title: string;

	constructor(id: number, title: string) {
		this.id = id;
		this.title = title;
	}
}
