import { ChildEntity, Column } from '../../../../src';
import { Content, ContentType } from './Content';

@ChildEntity(ContentType.Photo)
export class Photo extends Content {
	@Column()
	size: number;
}
