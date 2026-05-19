import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../../src/decorator/relations/ManyToMany';
import { Category } from './Category';
import { ManyToOne } from '../../../../../src/decorator/relations/ManyToOne';
import { User } from './User';
import { JoinTable } from '../../../../../src/decorator/relations/JoinTable';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@ManyToOne((type) => User)
	author: User;

	@ManyToMany((type) => Category)
	@JoinTable()
	categories: Category[];
}
