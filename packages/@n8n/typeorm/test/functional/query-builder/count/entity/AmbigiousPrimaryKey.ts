import { Entity, PrimaryColumn } from '../../../../../src';

@Entity('ambig_primary_key')
export class AmbigiousPrimaryKey {
	@PrimaryColumn()
	a: string;

	@PrimaryColumn()
	b: string;

	static make({ a, b }: { a: string; b: string }): AmbigiousPrimaryKey {
		const apk = new AmbigiousPrimaryKey();
		apk.a = a;
		apk.b = b;

		return apk;
	}
}
