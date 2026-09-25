import { Entity, PrimaryGeneratedColumn } from '../../../../../src';

@Entity({ name: 'commitNote' })
export class Note {
	@PrimaryGeneratedColumn()
	public id: number;
}
