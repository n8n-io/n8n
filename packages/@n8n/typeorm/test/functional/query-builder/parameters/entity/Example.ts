import { Entity, PrimaryColumn } from '../../../../../src';

@Entity()
export class Example {
	@PrimaryColumn()
	id: string;
}
