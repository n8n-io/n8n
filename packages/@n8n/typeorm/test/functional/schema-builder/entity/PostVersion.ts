import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column } from '../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../src/decorator/relations/ManyToOne';
import { JoinColumn } from '../../../../src';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { Post } from './Post';

@Entity()
export class PostVersion {
	@PrimaryColumn()
	id: number;

	@ManyToOne((type) => Post)
	@JoinColumn({ referencedColumnName: 'version' })
	post: Post;

	@Column()
	details: string;
}
