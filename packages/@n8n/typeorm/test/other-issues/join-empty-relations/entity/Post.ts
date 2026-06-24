import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { Category } from './Category';
import { ManyToMany } from '../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../src/decorator/relations/JoinTable';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@ManyToMany((type) => Category)
	@JoinTable()
	categories: Category[];
}
