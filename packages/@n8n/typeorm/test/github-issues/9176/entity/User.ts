import { Check, Column, Entity, PrimaryGeneratedColumn, Unique } from '../../../../src';

@Entity()
@Unique(['firstName', 'lastName', 'middleName'])
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	firstName: string;

	@Column()
	lastName: string;

	@Column()
	middleName: string;
}

@Entity()
@Check(`"age" > 18`)
export class CheckedUser {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	age: number;
}
