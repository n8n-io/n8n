import { Column } from '../../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { OneToOne } from '../../../../../../src/decorator/relations/OneToOne';
import { PostWithRelation } from './PostWithRelation';

@Entity()
export class CategoryWithRelation {
	@PrimaryColumn()
	id: number;

	@Column({ unique: true })
	name: string;

	@OneToOne(
		(type) => PostWithRelation,
		(post) => post.category,
	)
	post: PostWithRelation;
}
