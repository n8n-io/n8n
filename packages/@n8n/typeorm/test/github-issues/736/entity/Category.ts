import { Entity, PrimaryGeneratedColumn } from '../../../../src';
import { Tree } from '../../../../src/decorator/tree/Tree';
import { TreeParent } from '../../../../src/decorator/tree/TreeParent';
import { TreeChildren } from '../../../../src/decorator/tree/TreeChildren';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity()
@Tree('closure-table')
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@TreeParent()
	parentCategory: Category;

	@TreeChildren({ cascade: true })
	childCategories: Category[];
}
