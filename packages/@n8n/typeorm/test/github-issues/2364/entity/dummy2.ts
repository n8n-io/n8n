import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column, PrimaryColumn } from '../../../../src';

@Entity()
export class Dummy2 {
	@PrimaryColumn({
		generated: true,
		nullable: false,
		primary: true,
	})
	id: number;

	@Column({ default: 'name' })
	name: string;
}
