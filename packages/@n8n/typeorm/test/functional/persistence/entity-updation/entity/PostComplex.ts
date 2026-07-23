import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { PostEmbedded } from './PostEmbedded';
import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';

@Entity()
export class PostComplex {
	@PrimaryColumn()
	firstId: number;

	@Column({ default: 'Hello Complexity' })
	text: string;

	@Column((type) => PostEmbedded)
	embed: PostEmbedded;
}
