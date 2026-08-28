import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { BaseEntity } from '../../../../../src/repository/BaseEntity';
import { Column } from '../../../../../src/decorator/columns/Column';

@Entity('category_test')
export class Category extends BaseEntity {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;
}
