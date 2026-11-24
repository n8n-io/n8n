import { Column } from '../../../../../../src/decorator/columns/Column';
import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { Profile } from './Profile';
import { OneToOne } from '../../../../../../src/decorator/relations/OneToOne';
import { PrimaryColumn } from '../../../../../../src';

@Entity()
export class User {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	@OneToOne(
		(type) => Profile,
		(profile) => profile.user,
		{
			cascade: ['insert'],
		},
	)
	profile: Profile;
}
