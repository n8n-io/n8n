import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from '../../../../src';
import { Category } from './Category';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@ManyToMany(() => Category)
	@JoinTable()
	get categories() {
		return this._categories;
	}

	set categories(arr) {
		this._categories = arr;
	}

	private _categories: Category[];
}
