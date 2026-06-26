import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../../src/decorator/relations/ManyToMany';
import { Category } from './Category';
import { JoinTable } from '../../../../../src/decorator/relations/JoinTable';

@Entity()
export class Question {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@ManyToMany((type) => Category, { persistence: false })
	@JoinTable()
	categories: Category[] = [];
}
