import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from '../../../../src/index';
import { Photo } from './Photo';

@Entity()
export class PhotoMetadata {
	@PrimaryGeneratedColumn()
	id: number;

	@Column('int')
	height: number;

	@Column('int')
	width: number;

	@Column()
	orientation: string;

	@Column()
	compressed: boolean;

	@Column()
	comment: string;

	@OneToOne(
		(type) => Photo,
		(photo) => photo.metadata,
	)
	photo: Photo;
}
