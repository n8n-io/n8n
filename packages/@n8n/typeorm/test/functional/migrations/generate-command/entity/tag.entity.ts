import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';
import { ManyToOne } from '../../../../../src/decorator/relations/ManyToOne';
import { JoinColumn } from '../../../../../src/decorator/relations/JoinColumn';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { BaseEntity } from '../../../../../src/repository/BaseEntity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { Post } from './post.entity';

@Entity('tag_test')
export class Tag extends BaseEntity {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	@ManyToOne(() => Post)
	@JoinColumn({ name: 'tag_to_post' })
	posts: Post | null;
}
