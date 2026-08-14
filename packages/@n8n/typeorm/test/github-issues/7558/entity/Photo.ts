import { ChildEntity, Column } from '../../../../src';
import { Content } from './Content';

@ChildEntity('photo')
export class Photo extends Content {
	@Column()
	size: number;
}
