import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { PostStatus } from '../model/PostStatus';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column({ nullable: false })
	status: PostStatus;
}
