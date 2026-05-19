import { Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from '../../../../src';
import { Category } from './category';

@Entity({ name: 'product' })
export class Product {
	@PrimaryGeneratedColumn()
	id: string;

	@ManyToMany(
		() => Category,
		(category) => category.products,
	)
	@JoinTable({ name: 'product_category', synchronize: false })
	categories: Category[];
}
