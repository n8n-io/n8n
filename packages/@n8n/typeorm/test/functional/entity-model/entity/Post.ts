import { BaseEntity, Column, Entity, JoinTable, ManyToMany, PrimaryColumn } from '../../../../src';
import { Category } from './Category';

@Entity()
export class Post extends BaseEntity {
	@PrimaryColumn()
	id: number;

	@Column({
		nullable: true,
		unique: true,
	})
	externalId?: string;

	@Column()
	title: string;

	@Column({
		default: 'This is default text.',
	})
	text: string;

	@ManyToMany((type) => Category)
	@JoinTable()
	categories: Category[];
}
