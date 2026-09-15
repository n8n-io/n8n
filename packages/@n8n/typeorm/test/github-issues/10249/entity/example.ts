import { Column, Entity, PrimaryColumn } from '../../../../src';

@Entity()
export class Example {
	@PrimaryColumn()
	id: string;

	@Column({ update: false })
	notUpdatable: string;

	@Column()
	updatable: string;
}
