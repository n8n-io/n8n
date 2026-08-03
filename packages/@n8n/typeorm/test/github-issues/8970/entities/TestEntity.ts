import { Column, Entity, ObjectIdColumn, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class TestEntity {
	@ObjectIdColumn()
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ nullable: true })
	testColumn: string;
}
