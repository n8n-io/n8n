import { Column, Entity, PrimaryGeneratedColumn } from '../../../../../src';

export type PostCategory = {
	name: string;
};

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column({
		type: 'jsonb',
		default: ['Dmitry', 'Olimjon'],
	})
	authors: string[];

	@Column({
		type: 'jsonb',
		default: { name: 'TypeScript' },
	})
	category: PostCategory;

	@Column({
		type: 'jsonb',
		default: [{ name: 'TypeScript' }],
	})
	categories: PostCategory[];
}
