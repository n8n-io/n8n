import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	OneToMany,
	OneToOne,
	JoinColumn,
} from '../../../../src';
import { Photo } from './Photo';
import { Profile } from './Profile';

@Entity('users')
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToMany('photographs', 'user')
	photos: Photo[];

	@OneToOne('profiles')
	@JoinColumn()
	profile: Profile;
}
