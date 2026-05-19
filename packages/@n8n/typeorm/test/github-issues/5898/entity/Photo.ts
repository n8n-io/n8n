import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from '../../../../src';
import { Album } from './Album';

@Entity()
export class Photo {
	@PrimaryColumn()
	id: string;

	@ManyToOne(
		() => Album,
		(album) => album.photos,
		{ onDelete: 'CASCADE' },
	)
	@JoinColumn({ name: 'albumId' })
	album: Album;
}
