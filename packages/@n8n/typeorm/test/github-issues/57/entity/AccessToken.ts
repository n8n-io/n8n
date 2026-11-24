import { Generated } from '../../../../src';
import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../src/decorator/entity/Entity';
import { OneToOne } from '../../../../src/decorator/relations/OneToOne';
import { User } from './User';

@Entity()
export class AccessToken {
	@PrimaryColumn()
	@Generated()
	primaryKey: number;

	@Column()
	expireTime: number;

	@OneToOne(
		(type) => User,
		(user) => user.access_token,
		{
			cascade: true,
		},
	)
	user: User;
}
