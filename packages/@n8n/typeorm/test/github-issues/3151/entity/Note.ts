import { Column } from '../../../../src';
import { PrimaryGeneratedColumn } from '../../../../src';
import { Entity } from '../../../../src';
import { JoinTable } from '../../../../src';
import { ManyToMany } from '../../../../src';
import { Category } from './Category';

@Entity()
export class Note {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	content: string;

	@ManyToMany(
		(type) => Category,
		(category) => category.notes,
	)
	@JoinTable()
	categories: Category[];
}
