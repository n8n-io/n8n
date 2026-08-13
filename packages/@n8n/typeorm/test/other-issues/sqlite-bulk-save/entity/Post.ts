import { Column, Entity, PrimaryColumn } from '../../../../src';

@Entity()
export class Post {
	@PrimaryColumn()
	id: number;

	@Column()
	title: string;

	constructor(id?: number, title?: string) {
		if (id) this.id = id;
		if (title) this.title = title;
	}
}
