import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column('cube', {
		nullable: true,
	})
	mainColor: number[];

	@Column('cube', {
		nullable: true,
		array: true,
	})
	colors: number[][];
}
