import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../../src/decorator/relations/JoinTable';
import { OneToMany } from '../../../../../src/decorator/relations/OneToMany';
import { Category } from './Category';
import { User } from './User';
import { Photo } from './Photo';
import { ManyToOne } from '../../../../../src/decorator/relations/ManyToOne';
import { Counters } from './Counters';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@OneToMany(
		(type) => Photo,
		(photo) => photo.post,
	)
	photos: Photo[];

	@ManyToOne((type) => User)
	user: User;

	@ManyToMany((type) => Category)
	@JoinTable()
	categories: Category[];

	@Column((type) => Counters)
	counters: Counters;
}
