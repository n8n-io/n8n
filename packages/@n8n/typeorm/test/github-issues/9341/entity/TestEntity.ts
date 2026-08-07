import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class TestEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'bigint', nullable: true })
	big_int: number;

	@Column({ type: 'numeric', nullable: true })
	big_decimal: number;
}
