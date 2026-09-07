import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { OneToOne } from '../../../../../../src/decorator/relations/OneToOne';
import { JoinColumn } from '../../../../../../src/decorator/relations/JoinColumn';
import { DeleteDateColumn } from '../../../../../../src/decorator/columns/DeleteDateColumn';
import { CategoryWithRelation } from './CategoryWithRelation';

@Entity()
export class PostWithRelation {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@OneToOne(
		(type) => CategoryWithRelation,
		(category) => category.post,
		{
			eager: true,
		},
	)
	@JoinColumn()
	category: CategoryWithRelation;

	@DeleteDateColumn()
	deletedAt: Date;
}
