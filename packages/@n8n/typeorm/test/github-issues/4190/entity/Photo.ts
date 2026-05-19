import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from '../../../../src';
import { User } from './User';

@Entity()
export class Photo {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	url: string;

	@ManyToOne('User', 'photos')
	user: User;
}
