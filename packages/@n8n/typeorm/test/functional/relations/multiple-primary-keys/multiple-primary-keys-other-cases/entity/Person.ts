import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { OneToOne } from '../../../../../../src/decorator/relations/OneToOne';
import { JoinColumn } from '../../../../../../src/decorator/relations/JoinColumn';
import { User } from './User';
import { PrimaryColumn } from '../../../../../../src';

@Entity()
export class Person {
	@PrimaryColumn()
	userId: number;

	@Column()
	fullName: string;

	@OneToOne((type) => User)
	@JoinColumn()
	user: User;
}
