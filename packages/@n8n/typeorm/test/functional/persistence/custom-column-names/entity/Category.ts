import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Post } from './Post';
import { Column } from '../../../../../src/decorator/columns/Column';
import { OneToMany } from '../../../../../src/decorator/relations/OneToMany';
import { OneToOne } from '../../../../../src/decorator/relations/OneToOne';
import { JoinColumn } from '../../../../../src/decorator/relations/JoinColumn';
import { CategoryMetadata } from './CategoryMetadata';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@OneToMany(
		(type) => Post,
		(post) => post.category,
	)
	posts: Post[];

	@Column({ type: 'int', nullable: true })
	metadataId: number;

	@OneToOne(
		(type) => CategoryMetadata,
		(metadata) => metadata.category,
		{
			cascade: ['insert'],
		},
	)
	@JoinColumn({ name: 'metadataId' })
	metadata: CategoryMetadata;

	@Column()
	name: string;
}
