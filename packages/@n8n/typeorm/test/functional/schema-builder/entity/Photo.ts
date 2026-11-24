import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';

@Entity({ synchronize: false })
export class Photo {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	@Column()
	albumId: number;
}
