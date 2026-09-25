import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from '../../../../../src';
import { Category } from './Category';

@Entity()
export class OneToOneRelationEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@OneToOne(() => Category)
	@JoinColumn()
	category: Category;

	@Column()
	order: number;
}
