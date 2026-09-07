import { AccessToken } from './AccessToken';
import { JoinColumn } from '../../../../src/decorator/relations/JoinColumn';
import { OneToOne } from '../../../../src/decorator/relations/OneToOne';
import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../src/decorator/entity/Entity';
import { Generated } from '../../../../src/decorator/Generated';

@Entity()
export class User {
	@PrimaryColumn()
	@Generated()
	primaryKey: number;

	@Column()
	email: string;

	@OneToOne(
		(type) => AccessToken,
		(token) => token.user,
	)
	@JoinColumn()
	access_token: AccessToken;
}
