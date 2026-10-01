import { Entity, PrimaryGeneratedColumn, Column } from '../../../../src';

export enum AccountPermission {
	Thing1 = 1,
	Thing2 = 4,
	Thing3 = 3,
	Thing4 = 2,
}

@Entity('Roles')
export class Roles {
	@PrimaryGeneratedColumn()
	id: string;

	@Column('enum', { enum: AccountPermission, array: true, default: '{}' })
	accountPermission: AccountPermission[];
}
