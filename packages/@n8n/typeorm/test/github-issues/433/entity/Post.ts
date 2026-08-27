import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity()
export class Post {
	@PrimaryColumn()
	id: number;

	@Column({
		type: 'json',
		default: { hello: 'world' },
	})
	json: any;
}
