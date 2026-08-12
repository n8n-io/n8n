import { Column, PrimaryGeneratedColumn } from '../../../../src';
import { Entity } from '../../../../src';

enum UserType {
	ADMIN = 'ADMIN',
	USER = 'USER',
}

@Entity('user')
export class UserEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'enum', enum: UserType })
	userType: UserType;
}
