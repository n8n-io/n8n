import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from '../../../../../src/index';
import { Account } from './Account';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column()
	text: string;

	@ManyToOne((type) => Account)
	owner: Account;
}
