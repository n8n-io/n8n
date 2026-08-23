import {
	BaseEntity,
	Entity,
	Column,
	UpdateDateColumn,
	PrimaryGeneratedColumn,
} from '../../../../src';

@Entity()
export class Post extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', unique: true })
	title: string;

	@Column({ type: 'varchar' })
	description: string;

	@UpdateDateColumn()
	updated_at: Date;
}
