import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from '../../../../src';
import { Book } from './Book';

export const BORROWED = 'borrowed';

@Entity()
export class User {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	name: string;

	@ManyToMany((_type) => Book, {})
	@JoinTable({ name: BORROWED })
	public borrowed: Book[];
}
