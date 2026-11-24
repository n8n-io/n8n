import { ChildEntity, Column } from '../../../../../src';
import { Note } from './note';

@ChildEntity()
export class OwnerNote extends Note {
	@Column()
	public owner: string;
}
