import { Column, Entity, PrimaryColumn } from '../../../../src';

@Entity()
export class Post {
	@PrimaryColumn()
	id: number;

	@Column({ unique: true })
	version: number;

	@Column({ default: 'My post' })
	name: string;

	@Column()
	text: string;

	@Column()
	tag: string;
}
