import { Entity, PrimaryGeneratedColumn, TableInheritance } from '../../../../../src';

@Entity({ name: 'issueNote' })
@TableInheritance({ column: { type: String, name: 'type' } })
export class Note {
	@PrimaryGeneratedColumn()
	public id: number;
}
