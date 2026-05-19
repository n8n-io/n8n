import { Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from '../../../../src';
import { Category } from './Category';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne((type) => Category, { nullable: true, eager: false })
	lazyManyToOne: Promise<Category | null>;

	@ManyToOne((type) => Category, { nullable: true, eager: true })
	eagerManyToOne: Category | null;

	@OneToOne((type) => Category, { nullable: true, eager: false })
	@JoinColumn()
	lazyOneToOneOwner: Promise<Category | null>;

	@OneToOne((type) => Category, { nullable: true, eager: true })
	@JoinColumn()
	eagerOneToOneOwner: Category | null;

	// Not a column; actual value is stored on the other side of this relation
	@OneToOne(
		(type) => Category,
		(category) => category.backRef1,
		{
			eager: false,
		},
	)
	lazyOneToOne: Promise<Category | null>;

	// Not a column; actual value is stored on the other side of this relation
	@OneToOne(
		(type) => Category,
		(category) => category.backRef2,
		{
			eager: true,
		},
	)
	eagerOneToOne: Category | null;
}
