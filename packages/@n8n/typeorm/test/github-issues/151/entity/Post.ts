import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { Category } from './Category';
import { JoinColumn } from '../../../../src/decorator/relations/JoinColumn';
import { OneToOne } from '../../../../src/decorator/relations/OneToOne';
import { PostMetadata } from './PostMetadata';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@OneToOne((type) => Category, { cascade: true })
	@JoinColumn()
	category: Category | null;

	@OneToOne(
		(type) => PostMetadata,
		(metadata) => metadata.post,
		{
			cascade: true,
		},
	)
	@JoinColumn()
	metadata: PostMetadata | null;
}
