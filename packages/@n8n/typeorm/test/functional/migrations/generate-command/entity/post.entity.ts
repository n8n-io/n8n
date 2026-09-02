import { Entity } from '../../../../../src/decorator/entity/Entity';
import { BaseEntity } from '../../../../../src/repository/BaseEntity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { JoinTable, ManyToMany } from '../../../../../src';
import { Category } from './category.entity';

@Entity('post_test')
export class Post extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column({
		default: 'This is default text.',
	})
	text: string;

	@ManyToMany((type) => Category)
	@JoinTable()
	categories: Category[];
}
