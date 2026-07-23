import { OneToMany, Entity, PrimaryGeneratedColumn, Column } from '../../../../src';

import { UserPhoto } from './UserPhoto';

@Entity()
export class Photo {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToMany(
		() => UserPhoto,
		(userPhoto) => userPhoto.photo,
		{
			cascade: true,
		},
	)
	userPhotos: UserPhoto[];
}
