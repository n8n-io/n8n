import { Column, Entity, PrimaryGeneratedColumn } from '../../../../../src';

export type PostCategory = {
	name: string;
};

export enum PostStatus {
	draft = 'draft',
	published = 'published',
	unknown = 'unknown',
}

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column({
		type: 'varchar',
		array: true,
	})
	authors: string[];

	@Column({
		type: 'enum',
		enum: PostStatus,
		array: true,
	})
	statuses: PostStatus[];
}
