import { DataSource } from '../../../../../src';
import { ViewColumn } from '../../../../../src/decorator/columns/ViewColumn';
import { ViewEntity } from '../../../../../src/decorator/entity-view/ViewEntity';
import { Category } from './Category';
import { Post } from './Post';

@ViewEntity({
	materialized: true,
	expression: (connection: DataSource) =>
		connection
			.createQueryBuilder()
			.select('category.name', 'categoryName')
			.addSelect('COUNT(post.id)', 'postCount')
			.from(Post, 'post')
			.innerJoin(Category, 'category', 'category.id = post.categoryId')
			.groupBy('category.name'),
})
export class PostByCategory {
	@ViewColumn()
	categoryName: string;

	@ViewColumn()
	postCount: number;
}
