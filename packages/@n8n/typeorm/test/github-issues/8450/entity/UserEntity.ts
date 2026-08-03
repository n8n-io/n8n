import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity('user')
export class UserEntity {
	@PrimaryColumn('int')
	id: number;

	@Column({
		type: 'int',
		generatedType: 'STORED',
		asExpression: 'id * 2',
	})
	generated: number;
}
