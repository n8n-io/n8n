import { Entity, ManyToMany, PrimaryGeneratedColumn } from '../../../../src';
import { Product } from './product';

@Entity({ name: 'category' })
export class Category {
	@PrimaryGeneratedColumn()
	id: string;

	@ManyToMany(
		() => Product,
		(product) => product.categories,
	)
	products: Product[];
}
