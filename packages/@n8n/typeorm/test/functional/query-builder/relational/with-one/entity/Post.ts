import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../../../src/decorator/relations/ManyToOne';
import { Category } from './Category';
import { Image } from './Image';
import { OneToOne } from '../../../../../../src/decorator/relations/OneToOne';
import { JoinColumn } from '../../../../../../src/decorator/relations/JoinColumn';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@ManyToOne((type) => Category)
	category: Category;

	@OneToOne(
		(type) => Image,
		(image) => image.post,
	)
	@JoinColumn()
	image: Image;
}
