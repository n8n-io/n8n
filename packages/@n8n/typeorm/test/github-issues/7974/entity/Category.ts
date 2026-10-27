import {
	BaseEntity,
	Column,
	Entity,
	OneToMany,
	PrimaryGeneratedColumn,
	Tree,
	TreeChildren,
	TreeParent,
} from '../../../../src';
import { Site } from './Site';

@Entity()
@Tree('materialized-path')
export class Category extends BaseEntity {
	@PrimaryGeneratedColumn()
	pk: number;

	@Column({
		length: 250,
		nullable: false,
	})
	title: string;

	@TreeParent()
	parentCategory: Category | null;

	@TreeChildren()
	childCategories: Category[];

	@OneToMany(
		() => Site,
		(site) => site.parentCategory,
	)
	sites: Site[];
}
