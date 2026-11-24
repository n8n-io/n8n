import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Personalization {
	@PrimaryGeneratedColumn('uuid') public id: number;

	@Column() public logo: string;
}
