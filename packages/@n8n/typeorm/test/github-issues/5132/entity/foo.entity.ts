import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity('foo')
export class Foo extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ default: 1, type: 'int' })
	bar_default_1: number;

	@Column({ default: -1, type: 'int' })
	bar_default_minus_1: number;
}
