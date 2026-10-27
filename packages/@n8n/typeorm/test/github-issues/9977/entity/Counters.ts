import { Column, JoinTable, ManyToMany } from '../../../../src';
import { Author } from './Author';

export class Counters {
	@Column()
	likes: number;

	@ManyToMany(() => Author)
	@JoinTable()
	likedUsers: Author[];
}
