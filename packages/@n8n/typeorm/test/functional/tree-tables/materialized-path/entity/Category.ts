import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { TreeParent } from '../../../../../src/decorator/tree/TreeParent';
import { TreeChildren } from '../../../../../src/decorator/tree/TreeChildren';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Tree } from '../../../../../src/decorator/tree/Tree';
import { ManyToOne } from '../../../../../src/decorator/relations/ManyToOne';
import { JoinColumn } from '../../../../../src/decorator/relations/JoinColumn';
import { Product } from './Product';

@Entity({ name: 'categories' })
@Tree('materialized-path')
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@TreeParent()
	parentCategory: Category;

	@TreeChildren({ cascade: true })
	childCategories: Category[];

	@ManyToOne(
		() => Product,
		(product) => product.categories,
	)
	@JoinColumn()
	product: Product;
}
