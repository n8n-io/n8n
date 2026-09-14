import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity('post_test_2')
export class Post extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column({
		default: 'This is default text.',
	})
	text: string;

	@Column({
		nullable: true,
		default: null,
		type: String,
	})
	comments: string | null;
}
