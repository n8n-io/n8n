import {
	Entity,
	OneToMany,
	Column,
	PrimaryGeneratedColumn,
	TableInheritance,
	ChildEntity,
} from '../../../../src';
import { Comment } from './Comment';

@Entity()
@TableInheritance({ column: { type: 'string', name: 'postType' } })
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column()
	postType: string = 'BasePost';

	@OneToMany(
		() => Comment,
		(entity) => entity.post,
	)
	comments?: Comment[];
}

@ChildEntity('TargetPost')
export class TargetPost extends Post {
	@Column()
	postType: string = 'TargetPost';
}
