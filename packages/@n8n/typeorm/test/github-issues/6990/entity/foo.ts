import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Foo {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		array: true,
		type: 'varchar',
		length: 64,
		nullable: true,
	})
	varchararray: string[];
}
