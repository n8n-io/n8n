import { ViewEntity, ViewColumn, DataSource, Index } from '../../../../src';
import { Category } from './Category';
import { Post } from './Post';

@ViewEntity({
	materialized: true,
	expression: (dataSource: DataSource) =>
		dataSource
			.createQueryBuilder()
			.select('post.id', 'id')
			.addSelect('post.name', 'name')
			.addSelect('category.name', 'categoryName')
			.from(Post, 'post')
			.leftJoin(Category, 'category', 'category.id = post.categoryId'),
})
export class PostCategory {
	@ViewColumn()
	id: number;

	@Index('name-idx')
	@ViewColumn()
	name: string;

	@ViewColumn()
	categoryName: string;
}
