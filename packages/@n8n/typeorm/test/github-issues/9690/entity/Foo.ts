import { Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Foo {
	@PrimaryGeneratedColumn({ name: 'id' })
	id: number;
}
