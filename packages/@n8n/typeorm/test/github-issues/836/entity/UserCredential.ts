import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column } from '../../../../src/decorator/columns/Column';
import { OneToOne } from '../../../../src/decorator/relations/OneToOne';
import { JoinColumn } from '../../../../src/decorator/relations/JoinColumn';
import { User } from './User';
import { PrimaryColumn } from '../../../../src';

@Entity()
export class UserCredential {
	@OneToOne(() => User, {
		cascade: true,
	})
	@JoinColumn({
		name: 'id',
		referencedColumnName: 'id',
	})
	user: User;

	@PrimaryColumn()
	id: number;

	@Column()
	password: string;

	@Column()
	salt: string;
}
