import { Column, Entity, OneToMany, PrimaryColumn } from '../../../../../src';
import { Photo } from './Photo';

@Entity()
export class Author {
	@PrimaryColumn()
	id: number;

	@Column()
	firstName: string;

	@Column()
	lastName: string;

	@Column()
	age: number;

	@OneToMany(
		() => Photo,
		(photo) => photo.author,
	)
	photos: Photo[];
}
