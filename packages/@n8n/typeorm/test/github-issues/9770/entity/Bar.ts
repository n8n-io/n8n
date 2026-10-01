import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from '../../../../src';

import { Foo } from './Foo';

@Entity()
export class Bar {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => Foo, {
		cascade: true,
		onDelete: 'CASCADE',
		nullable: false,
	})
	@JoinColumn()
	foo!: Foo;

	@Column()
	data: string;
}
