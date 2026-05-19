import { Column, PrimaryGeneratedColumn } from '../../../../src';
import { Entity } from '../../../../src/decorator/entity/Entity';

@Entity('foo')
export class Foo {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	description: string;
}
