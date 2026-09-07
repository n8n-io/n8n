import { Column, Entity, PrimaryColumn } from '../../../../src';

@Entity({ withoutRowid: true })
export class Post {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;
}
