import { Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Party {
	@PrimaryGeneratedColumn('uuid')
	id: string;
}
