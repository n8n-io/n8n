import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class User extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;
}
