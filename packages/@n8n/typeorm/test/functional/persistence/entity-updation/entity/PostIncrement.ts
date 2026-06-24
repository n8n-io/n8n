import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';

@Entity()
export class PostIncrement {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	text: string;
}
