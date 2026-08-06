import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity('foo_test')
export class Foo extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		nullable: false,
		type: 'varchar',
		default: () => "concat(chr(65), 'FMU000')",
	})
	displayId: string;
}
