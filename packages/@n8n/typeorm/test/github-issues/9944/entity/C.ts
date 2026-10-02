import { Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from '../../../../src';
import { A } from './A';
import { D } from './D';

@Entity()
export class C {
	@PrimaryGeneratedColumn('increment')
	id!: number;

	@ManyToOne(
		() => A,
		(a) => a.b.cs,
		{
			onDelete: 'CASCADE',
			onUpdate: 'CASCADE',
			nullable: false,
		},
	)
	a!: A;

	@OneToMany(
		() => D,
		(d) => d.c,
		{
			cascade: true,
			orphanedRowAction: 'delete',
			eager: true,
		},
	)
	ds!: D[];
}
