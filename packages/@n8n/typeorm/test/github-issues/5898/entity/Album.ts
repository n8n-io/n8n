import { Entity, OneToMany, PrimaryGeneratedColumn } from '../../../../src';
import { Photo } from './Photo';

@Entity()
export class Album {
	@PrimaryGeneratedColumn()
	id: string;

	@OneToMany(
		() => Photo,
		(photo) => photo.album,
		{ onDelete: 'CASCADE' },
	)
	photos: Photo[];
}
