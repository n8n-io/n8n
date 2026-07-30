import {
	BaseEntity,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from '../../../../src';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity()
export class Post extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	type: string;

	@Column({ nullable: true })
	token: string;

	@Column('simple-json', { default: '{}' })
	values: Object;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
