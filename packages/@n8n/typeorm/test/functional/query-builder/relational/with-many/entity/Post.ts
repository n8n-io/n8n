import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../../../src/decorator/relations/ManyToOne';
import { Category } from './Category';
import { Image } from './Image';
import { ManyToMany } from '../../../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../../../src/decorator/relations/JoinTable';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@ManyToOne(
		(type) => Category,
		(category) => category.posts,
	)
	category: Category;

	@ManyToMany(
		(type) => Image,
		(image) => image.posts,
	)
	@JoinTable()
	images: Image[];
}
