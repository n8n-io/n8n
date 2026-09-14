import { Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class ExampleText {
	@PrimaryGeneratedColumn()
	id: string;
}
