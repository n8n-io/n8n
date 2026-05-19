import { OneToMany } from '../../../../src';
import { C } from './C';

export class B {
	@OneToMany(
		() => C,
		(c: C) => c.a,
		{
			cascade: true,
			eager: true,
		},
	)
	cs!: C[];
}
