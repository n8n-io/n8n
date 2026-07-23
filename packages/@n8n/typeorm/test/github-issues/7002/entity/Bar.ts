import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from '../../../../src';
import { Foo } from './Foo';

@Entity()
export class Bar {
	@PrimaryGeneratedColumn('increment')
	id: number;

	@Column()
	title: string;

	@OneToOne(
		() => Foo,
		(foo) => foo.bar,
		{ cascade: true, eager: true },
	)
	foo: Foo;
}
