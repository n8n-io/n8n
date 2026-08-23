import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column('ltree', {
		nullable: false,
	})
	path: string;
}
