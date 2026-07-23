import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { UpdateDateColumn } from '../../../../src/decorator/columns/UpdateDateColumn';
import { OneToOne } from '../../../../src/decorator/relations/OneToOne';
import { PostCategory } from './PostCategory';
import { JoinColumn } from '../../../../src/decorator/relations/JoinColumn';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column({ default: false })
	active: boolean;

	@UpdateDateColumn()
	updateDate: Date;

	@OneToOne((type) => PostCategory)
	@JoinColumn()
	category: PostCategory;

	@Column()
	updatedColumns: number = 0;

	@Column()
	updatedRelations: number = 0;
}
