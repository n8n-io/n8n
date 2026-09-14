import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class TestEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column('varchar')
	type: string;
}
