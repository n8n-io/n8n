import { Column, Entity, Tree, TreeChildren, TreeParent } from '../../../../src';
import { Slug } from './Slug';

@Entity()
@Tree('materialized-path')
export class Category {
	@Column((type) => Slug, { prefix: false })
	id: Slug;

	@TreeChildren()
	children: Category[];

	@TreeParent()
	parent: Category;

	constructor(slug: string, parent?: Category) {
		this.id = new Slug(slug);
		if (parent) this.parent = parent;
	}
}
