import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column({ type: 'text' })
	text: string;

	@Column({ type: 'int' })
	likesCount: number;

	@Column({ type: 'int' })
	commentsCount: number;

	@Column({ type: 'int' })
	watchesCount: number;
}
