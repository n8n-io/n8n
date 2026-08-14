import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../../../src/decorator/relations/JoinTable';
import { Category } from './Category';
import { User } from './User';
import { ManyToOne } from '../../../../../../src/decorator/relations/ManyToOne';
import { OneToMany } from '../../../../../../src/decorator/relations/OneToMany';
import { Editor } from './Editor';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@ManyToMany((type) => Category, { eager: true })
	@JoinTable()
	categories1: Category[];

	@ManyToMany(
		(type) => Category,
		(category) => category.posts2,
		{
			eager: true,
		},
	)
	categories2: Category[];

	@ManyToOne((type) => User, { eager: true })
	author: User;

	@OneToMany(
		(type) => Editor,
		(editor) => editor.post,
		{ eager: true },
	)
	editors: Editor[];
}
