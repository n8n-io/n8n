import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src/index';
import { Category } from './Category';
import { JoinTable } from '../../../../src/decorator/relations/JoinTable';
import { ManyToMany } from '../../../../src/decorator/relations/ManyToMany';

@Entity()
export class Animal {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToMany((type) => Category, { eager: true })
	@JoinTable()
	categories: Category[];
}
