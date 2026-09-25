import * as TypeOrm from '../../../../../../src';
import { Person } from './Person';

@TypeOrm.Entity({ name: 'person' })
export class Author extends Person {
	@TypeOrm.Column({ default: null })
	public authorName: string;
}
