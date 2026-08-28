import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { User } from './User';
import { Photo } from './Photo';
import { OneToOne } from '../../../../../../src/decorator/relations/OneToOne';
import { JoinColumn } from '../../../../../../src/decorator/relations/JoinColumn';
import { PrimaryColumn } from '../../../../../../src';

@Entity()
export class Profile {
	@PrimaryColumn()
	id: number;

	@OneToOne(
		(type) => User,
		(user) => user.profile,
		{
			nullable: false,
		},
	)
	@JoinColumn()
	user: User;

	@OneToOne((type) => Photo, {
		nullable: false,
		cascade: ['insert'],
	})
	@JoinColumn()
	photo: Photo;
}
