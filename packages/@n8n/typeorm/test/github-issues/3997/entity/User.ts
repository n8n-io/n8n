import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from '../../../../src';
import { Photo } from './Photo';

@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column('decimal', { precision: 9, scale: 6 })
	height: number;

	@OneToMany(
		(_type) => Photo,
		(type) => type.user,
		{ cascade: true },
	)
	photos: Photo[];
}
