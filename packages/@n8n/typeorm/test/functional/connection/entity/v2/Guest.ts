import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { OneToMany } from '../../../../../src/decorator/relations/OneToMany';
import { Comment } from './Comment';

@Entity()
export class Guest {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	username: string;

	@OneToMany(
		(type) => Comment,
		(comment) => comment.author,
	)
	comments: Comment[];
}
