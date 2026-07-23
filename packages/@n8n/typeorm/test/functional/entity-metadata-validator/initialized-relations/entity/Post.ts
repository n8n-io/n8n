import { OneToOne } from '../../../../../src/decorator/relations/OneToOne';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../../src/decorator/relations/ManyToMany';
import { Category } from './Category';
import { JoinTable } from '../../../../../src/decorator/relations/JoinTable';
import { JoinColumn } from '../../../../../src/decorator/relations/JoinColumn';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@OneToOne((type) => Category)
	@JoinColumn()
	category: Category;

	@ManyToMany((type) => Category)
	@JoinTable()
	categories: Category[] = [];
}
