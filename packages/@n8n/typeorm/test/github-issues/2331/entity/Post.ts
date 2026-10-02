import { BaseEntity, Entity, Column, PrimaryColumn } from '../../../../src';

@Entity()
export class Post extends BaseEntity {
	@PrimaryColumn()
	id: number;

	@Column({ type: 'varchar' })
	title: string;

	@Column({ type: 'varchar', nullable: true })
	author: string | null;
}
