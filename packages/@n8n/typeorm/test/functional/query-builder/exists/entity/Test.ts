import { Entity, PrimaryColumn } from '../../../../../src';

@Entity('tests')
export class Test {
	@PrimaryColumn()
	id: string;
}
