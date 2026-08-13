import { Entity, PrimaryColumn } from '../../../../../src';

@Entity('tests')
export class Test {
	@PrimaryColumn()
	varcharField: string;

	@PrimaryColumn('uuid')
	uuidField: string;

	@PrimaryColumn()
	intField: number;
}
