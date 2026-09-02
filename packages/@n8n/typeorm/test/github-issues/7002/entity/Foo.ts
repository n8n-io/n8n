import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	OneToOne,
	PrimaryColumn,
} from '../../../../src';
import { Bar } from './Bar';

@Entity()
export class Foo {
	@PrimaryColumn()
	id: number;

	@Column()
	text: string;

	@PrimaryColumn()
	barId: number;

	@OneToOne(
		() => Bar,
		(b) => b.foo,
	)
	@JoinColumn({ name: 'id', referencedColumnName: 'id' })
	bar: Bar;

	@CreateDateColumn()
	d: Date;
}
