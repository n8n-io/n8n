import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src/index';
import { Category } from './Category';
import { ManyToMany } from '../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../src/decorator/relations/JoinTable';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column()
	count: number;

	@ManyToMany((type) => Category)
	@JoinTable()
	categories: Category[];
}
