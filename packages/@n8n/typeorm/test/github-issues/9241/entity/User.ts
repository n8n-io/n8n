import {
	Entity,
	PrimaryGeneratedColumn,
	OneToMany,
	Column,
	TableInheritance,
} from '../../../../src';

import { UserPhoto } from './UserPhoto';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToMany(
		() => UserPhoto,
		(userPhoto) => userPhoto.user,
		{
			cascade: true,
		},
	)
	userPhotos: UserPhoto[];
}
