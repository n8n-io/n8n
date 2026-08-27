import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { ManyToMany } from '../../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../../src/decorator/relations/JoinTable';
import { Category } from './Category';

@Entity({
	schema: 'yoman',
})
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToMany((type) => Category)
	@JoinTable({ schema: 'yoman' })
	categories: Category[];
}
