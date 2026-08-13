import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class TestChild {
	@Column()
	public value: string;
	@PrimaryGeneratedColumn('uuid')
	public uuid: string;
}
