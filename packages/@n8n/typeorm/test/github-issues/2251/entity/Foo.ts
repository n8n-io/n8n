import { Column, OneToMany, PrimaryGeneratedColumn } from '../../../../src';
import { Entity } from '../../../../src/decorator/entity/Entity';
import { Bar } from './Bar';

@Entity('foo')
export class Foo {
	@PrimaryGeneratedColumn() id: number;

	@Column({ default: 'foo description' }) description: string;

	@OneToMany(
		() => Bar,
		(bar) => bar.foo,
		{ cascade: true, eager: true },
	)
	bars?: Bar[];
}
