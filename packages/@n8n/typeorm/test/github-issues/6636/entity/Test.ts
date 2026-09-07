import { Column, Entity, PrimaryColumn } from '../../../../src';

@Entity()
export class Test {
	@PrimaryColumn()
	id: number;

	@Column({ nullable: true, precision: 6 })
	startedAt?: Date;

	@Column({ type: 'decimal', precision: 5, scale: 2 })
	value: number;
}
