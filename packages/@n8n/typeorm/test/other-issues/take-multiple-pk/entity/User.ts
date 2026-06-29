import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../src/decorator/entity/Entity';
import { JoinTable } from '../../../../src/decorator/relations/JoinTable';
import { ManyToMany } from '../../../../src/decorator/relations/ManyToMany';
import { Role } from './Role';

@Entity()
export class User {
	@PrimaryColumn() id: number;

	@PrimaryColumn() name: string;

	@Column() handedness: string;

	@ManyToMany((type) => Role, {
		cascade: ['insert'],
	})
	@JoinTable()
	roles: Role[];
}
