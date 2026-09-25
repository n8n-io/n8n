import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';

@Entity()
export class Post {
	@PrimaryColumn()
	id: number;

	@Column({ type: String, default: 'hello default value', nullable: true })
	title?: string | null;
}
