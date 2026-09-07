import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { OneToMany } from '../../../../src/decorator/relations/OneToMany';

import { Detail } from './detail';

@Entity()
export class Master {
	@PrimaryColumn({
		length: 20,
	})
	id: string;

	@Column({
		nullable: false,
		length: 150,
	})
	description: string;

	@OneToMany(
		(type) => Detail,
		(detail) => detail.master,
	)
	details: Detail[];
}
