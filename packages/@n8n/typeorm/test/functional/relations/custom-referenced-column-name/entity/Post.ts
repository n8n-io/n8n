import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { ManyToOne } from '../../../../../src/decorator/relations/ManyToOne';
import { JoinColumn } from '../../../../../src/decorator/relations/JoinColumn';
import { Category } from './Category';
import { OneToOne } from '../../../../../src/decorator/relations/OneToOne';
import { Tag } from './Tag';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column({ nullable: true })
	categoryName: string;

	@Column({ type: 'int', nullable: true })
	categoryId: number;

	@Column({ nullable: true })
	tagName: string;

	@Column({ type: 'int', nullable: true })
	tagId: number;

	@ManyToOne((type) => Category)
	@JoinColumn()
	categoryWithEmptyJoinCol: Category;

	@ManyToOne((type) => Category)
	@JoinColumn({ name: 'categoryId' })
	categoryWithoutRefColName: Category;

	@ManyToOne((type) => Category)
	@JoinColumn({ referencedColumnName: 'name' })
	categoryWithoutColName: Category;

	@ManyToOne((type) => Category)
	@JoinColumn({ name: 'categoryIdentifier' })
	categoryWithoutRefColName2: Category;

	@ManyToOne((type) => Category)
	@JoinColumn({ name: 'categoryName', referencedColumnName: 'name' })
	category: Category;

	@OneToOne((type) => Tag)
	@JoinColumn()
	tagWithEmptyJoinCol: Tag;

	@OneToOne((type) => Tag)
	@JoinColumn({ name: 'tagId' })
	tagWithoutRefColName: Tag;

	@OneToOne((type) => Tag)
	@JoinColumn({ referencedColumnName: 'name' })
	tagWithoutColName: Tag;

	@OneToOne((type) => Tag)
	@JoinColumn({ name: 'tagIdentifier' })
	tagWithoutRefColName2: Tag;

	@OneToOne((type) => Tag)
	@JoinColumn({ name: 'tagName', referencedColumnName: 'name' })
	tag: Tag;
}
