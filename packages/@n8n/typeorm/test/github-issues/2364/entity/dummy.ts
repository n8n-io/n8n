import { Column } from '../../../../src/decorator/columns/Column';
import { Entity } from '../../../../src/decorator/entity/Entity';

@Entity()
export class Dummy {
	@Column({
		generated: true,
		nullable: false,
		primary: true,
	})
	id: number;

	@Column({ default: 'name' })
	name: string;
}
