import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	PrimaryGeneratedColumn,
} from '../../../../src';
import { Category } from './Category';

@Entity()
export class Site extends BaseEntity {
	@PrimaryGeneratedColumn()
	pk: number;

	@CreateDateColumn()
	createdAt: Date;

	@Column({
		length: 250,
		nullable: false,
	})
	title: string;

	@ManyToOne(() => Category)
	parentCategory: Category;
}
