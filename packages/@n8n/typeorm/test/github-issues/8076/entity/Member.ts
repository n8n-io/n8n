import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from '../../../../src';
import { Category } from './Category';

@Entity()
export class Member extends BaseEntity {
	@PrimaryGeneratedColumn()
	pk: number;

	@Column({
		length: 250,
		nullable: false,
	})
	title: string;

	@ManyToOne(
		() => Category,
		(c) => c.members,
	)
	category: Category;
}
