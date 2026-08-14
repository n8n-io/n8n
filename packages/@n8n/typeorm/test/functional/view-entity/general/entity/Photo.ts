import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from '../../../../../src';
import { Album } from './Album';

@Entity()
export class Photo {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column()
	albumId: number;

	@ManyToOne(() => Album)
	@JoinColumn({ name: 'albumId' })
	album: Album;
}
