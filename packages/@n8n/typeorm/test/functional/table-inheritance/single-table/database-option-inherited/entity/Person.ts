import { Column, Entity, PrimaryGeneratedColumn, TableInheritance } from '../../../../../../src';

@Entity({ database: 'test' })
@TableInheritance({ column: { name: 'type', type: 'varchar' } })
export class Person {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;
}
