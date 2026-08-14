import {
	Column,
	Entity,
	JoinTable,
	ManyToMany,
	ManyToOne,
	PrimaryColumn,
} from '../../../../../src';
import { Tag } from './Tag';
import { Author } from './Author';
import { Counters } from './Counters';

@Entity()
export class Post {
	@PrimaryColumn()
	id: number;

	@Column()
	title: string;

	@Column()
	text: string;

	@ManyToMany(
		() => Tag,
		(tag) => tag.posts,
	)
	@JoinTable()
	tags: Tag[];

	@ManyToOne(() => Author)
	author: Author;

	@Column(() => Counters)
	counters: Counters;

	toString() {
		return this.title;
	}

	doSomething() {
		return 123;
	}
}
