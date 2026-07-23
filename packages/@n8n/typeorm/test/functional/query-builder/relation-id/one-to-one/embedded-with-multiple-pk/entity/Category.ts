import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../../../../src/decorator/columns/PrimaryColumn';

@Entity()
export class Category {
	@PrimaryColumn()
	id: number;

	@PrimaryColumn()
	name: string;
}
