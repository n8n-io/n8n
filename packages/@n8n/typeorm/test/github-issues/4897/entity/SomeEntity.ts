import { Column, PrimaryGeneratedColumn } from '../../../../src';
import { Entity } from '../../../../src';

export type UserRoleType = 'user' | 'admin';
export const userRoles = {
	USER: 'user' as UserRoleType,
	ADMIN: 'admin' as UserRoleType,
};

export enum UserRoles {
	USER = 'user',
	ADMIN = 'admin',
}

@Entity()
export class SomeEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		type: 'simple-enum',
		enum: Object.values(userRoles),
		default: userRoles.USER,
	})
	test: UserRoleType;

	@Column({
		type: 'simple-enum',
		enum: UserRoles,
		default: UserRoles.USER,
	})
	test2: UserRoles;
}
