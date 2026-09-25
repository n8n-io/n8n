import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Foo {
	@PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_foo' })
	id: string;

	@Column('numeric', {
		precision: 12,
		scale: 7,
		array: true,
	})
	bar: number[];
}
