import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { ContentModule } from './ContentModule';

@Entity()
export class Post extends ContentModule {
	@Column()
	title: string;

	@Column()
	text: string;
}
