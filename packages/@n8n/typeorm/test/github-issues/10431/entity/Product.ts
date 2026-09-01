import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from '../../../../src';
import { Category } from './Category';

@Entity()
export class Product {
	@PrimaryGeneratedColumn()
	id: number;

	@Column('varchar')
	name: string;

	@ManyToMany(
		() => Category,
		(category: Category) => category.products,
		{
			eager: true,
			cascade: ['insert', 'update', 'remove'],
			orphanedRowAction: 'delete',
		},
	)
	@JoinTable()
	categories: Category[];
}
