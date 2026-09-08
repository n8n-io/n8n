import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity()
export class PostCategory {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;
}
