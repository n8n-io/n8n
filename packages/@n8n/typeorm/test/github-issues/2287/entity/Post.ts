import { Entity, PrimaryGeneratedColumn } from '../../../../src';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column('int', { array: true, nullable: true })
	skill_id_array: number[];
}
