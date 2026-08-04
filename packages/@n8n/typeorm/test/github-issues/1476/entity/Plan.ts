import { Entity, PrimaryColumn, Column } from '../../../../src/index';

@Entity()
export class Plan {
	@PrimaryColumn()
	planId: number;

	@Column()
	planName: string;
}
