import { Column, Entity, PrimaryColumn } from '../../../../src';

@Entity()
export class Document {
	@PrimaryColumn()
	id: number;

	@Column({ nullable: true, select: false })
	name: string;

	@Column({ insert: false, select: false, nullable: true })
	permission: number;

	@Column({ insert: false, default: 1 })
	version: number;
}
