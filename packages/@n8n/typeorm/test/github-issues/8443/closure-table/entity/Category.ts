import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { TreeParent } from '../../../../../src/decorator/tree/TreeParent';
import { TreeChildren } from '../../../../../src/decorator/tree/TreeChildren';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Tree } from '../../../../../src/decorator/tree/Tree';
import { JoinColumn } from '../../../../../src';

@Entity()
@Tree('closure-table')
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@TreeParent()
	@JoinColumn({
		name: 'parent_category_id',
	})
	parentCategory: Category;

	@TreeChildren({ cascade: true })
	childCategories: Category[];

	// @TreeLevelColumn()
	// level: number;
}
