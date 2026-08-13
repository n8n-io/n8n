import { Column, Entity, PrimaryGeneratedColumn, Unique } from '../../../../src';

@Entity()
@Unique(['age'])
@Unique('unique-email', ['email'])
@Unique('unique-email-nickname', ['email', 'nickname'])
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	email: string;

	@Column()
	nickname: string;

	@Column()
	age: number;
}
