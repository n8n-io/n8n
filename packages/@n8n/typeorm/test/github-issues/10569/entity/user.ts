import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity({ name: 'user' })
export class User {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column('varchar')
	name: string;
}
