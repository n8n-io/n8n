import { Column, Entity, ManyToMany, PrimaryGeneratedColumn, VirtualColumn } from '../../../../src';
import { Product } from './Product';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@VirtualColumn({
		query: (alias) => `SELECT COUNT(*) FROM category WHERE id = ${alias}.id`,
	})
	randomVirtualColumn: number;

	@ManyToMany(
		() => Product,
		(product: Product) => product.categories,
	)
	products?: Product[];

	@Column('varchar')
	name: string;
}
