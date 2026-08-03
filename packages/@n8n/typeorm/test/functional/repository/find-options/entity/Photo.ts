import { Entity } from '../../../../../src/decorator/entity/Entity';
import { JoinTable, ManyToMany, PrimaryGeneratedColumn } from '../../../../../src/index';
import { Column } from '../../../../../src/decorator/columns/Column';
import { Category } from './Category';

@Entity()
export class Photo {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		length: 500,
	})
	name: string;

	@Column()
	description: string;

	@Column()
	filename: string;

	@Column()
	views: number;

	@Column()
	isPublished: boolean;

	@ManyToMany((type) => Category)
	@JoinTable()
	categories: Category[];
}
