import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	Tree,
	TreeParent,
	TreeChildren,
} from '../../../../src';

@Entity()
@Tree('materialized-path')
export class Category {
	@PrimaryGeneratedColumn()
	cat_id: number;

	@Column()
	cat_name: string;

	@TreeParent()
	cat_parent: Category;

	@TreeChildren({ cascade: true })
	cat_children: Category[];
}
