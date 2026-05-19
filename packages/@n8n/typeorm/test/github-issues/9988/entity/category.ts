import { Entity, ManyToMany, PrimaryGeneratedColumn } from '../../../../src';
import { Product } from './product';

@Entity({ name: 'category' })
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToMany(
		() => Product,
		(product) => product.categories,
	)
	products: Product[];
}
