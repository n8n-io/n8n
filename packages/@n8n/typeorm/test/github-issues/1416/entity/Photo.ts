import {
	Column,
	Entity,
	PrimaryGeneratedColumn,
	OneToOne,
	ManyToOne,
	JoinColumn,
} from '../../../../src/index';
import { PhotoMetadata } from './PhotoMetadata';
import { Author } from './Author';

@Entity()
export class Photo {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		length: 500,
	})
	name: string;

	@Column('text')
	description: string;

	@Column()
	filename: string;

	@Column()
	isPublished: boolean;

	@ManyToOne(
		(type) => Author,
		(author) => author.photos,
	)
	author: Author;

	@OneToOne(
		(type) => PhotoMetadata,
		(photoMetadata) => photoMetadata.photo,
		{
			eager: true,
		},
	)
	@JoinColumn()
	metadata: PhotoMetadata;
}
