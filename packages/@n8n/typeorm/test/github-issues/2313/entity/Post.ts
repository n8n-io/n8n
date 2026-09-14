import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from '../../../../src';

@Entity()
export class Post extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	data: number;
}
