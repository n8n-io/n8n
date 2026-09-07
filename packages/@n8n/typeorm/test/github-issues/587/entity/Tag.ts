import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity('Tags')
export class Tag {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	a: string;

	@Column()
	b: string;

	@Column()
	c: string;
}
