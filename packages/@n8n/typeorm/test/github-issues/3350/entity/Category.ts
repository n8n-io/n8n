import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Entity } from '../../../../src/decorator/entity/Entity';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;
}
