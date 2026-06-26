import { Entity, Column, PrimaryGeneratedColumn } from '../../../../src';

@Entity({ name: 'person' })
export class Person {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column({ type: 'int', nullable: true })
	age: number | null;
}
