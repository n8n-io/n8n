import { ChildEntity, Column } from '../../../../src';
import { Content, ContentType } from './Content';

@ChildEntity(ContentType.Post)
export class Post extends Content {
	@Column()
	viewCount: number;
}
