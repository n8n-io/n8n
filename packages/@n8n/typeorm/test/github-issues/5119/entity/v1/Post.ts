import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from '../../../../../src/index';
import { User } from './User';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column()
	text: string;

	@ManyToOne((type) => User)
	owner: User;
}
