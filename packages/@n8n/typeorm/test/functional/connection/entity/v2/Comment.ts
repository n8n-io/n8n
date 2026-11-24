import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../../src/decorator/relations/ManyToOne';
import { Index } from '../../../../../src/decorator/Index';
import { Guest } from './Guest';

@Entity()
@Index('author_and_title_unique_rename', ['author', 'title', 'context'], {
	unique: true,
})
export class Comment {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	@Index()
	title: string;

	@Column()
	context: string;

	@ManyToOne(
		(type) => Guest,
		(guest) => guest.comments,
	)
	author: Guest;
}
