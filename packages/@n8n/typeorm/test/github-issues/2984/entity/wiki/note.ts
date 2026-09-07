import { Entity, PrimaryGeneratedColumn, TableInheritance } from '../../../../../src';

@Entity({ name: 'wikiNote' })
@TableInheritance({ column: { type: String, name: 'type' } })
export class Note {
	@PrimaryGeneratedColumn()
	public id: number;
}
