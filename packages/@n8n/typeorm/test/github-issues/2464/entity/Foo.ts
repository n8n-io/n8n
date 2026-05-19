import { BaseEntity, JoinTable, ManyToMany, PrimaryColumn } from '../../../../src';

import { Bar } from './Bar';
import { Entity } from '../../../../src/decorator/entity/Entity';

@Entity('foo')
export class Foo extends BaseEntity {
	@PrimaryColumn() id: number;

	@JoinTable()
	@ManyToMany(
		() => Bar,
		(bar) => bar.foos,
		{
			cascade: ['insert', 'update'],
			onDelete: 'NO ACTION',
		},
	)
	bars?: Bar[];

	@JoinTable()
	@ManyToMany(
		() => Bar,
		(bar) => bar.foos,
		{
			cascade: ['insert', 'update'],
		},
	)
	otherBars?: Bar[];
}
