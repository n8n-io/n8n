import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from '../../../../../src';
import { Category } from './Category';

@Entity()
export class Album {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column()
	categoryId: number;

	@ManyToOne(() => Category)
	@JoinColumn({ name: 'categoryId' })
	category: Category;
}
