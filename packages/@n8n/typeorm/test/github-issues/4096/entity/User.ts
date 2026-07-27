import { Entity, PrimaryColumn, Column } from '../../../../src';

@Entity()
export class User {
	@PrimaryColumn()
	email: string;

	@PrimaryColumn()
	username: string;

	@Column()
	bio: string;
}
