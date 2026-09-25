import { Entity, PrimaryGeneratedColumn } from '../../../../../../src';

@Entity()
export class User {
	@PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_ID' })
	id: number;
}
