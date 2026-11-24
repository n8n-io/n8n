import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { Content } from './Content';

@Entity()
export class Post extends Content {
	@Column()
	text: string;
}
