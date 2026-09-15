import { PrimaryColumn, Column } from '../../../../src';
import { Entity } from '../../../../src/decorator/entity/Entity';

@Entity()
export class User {
	@PrimaryColumn()
	id: number;

	@Column({ type: 'varchar', array: true })
	array: string[];

	@Column({ type: 'varchar', array: true, nullable: false })
	nonNullArray: string[];

	@Column({ type: 'varchar', array: true, nullable: false, default: [] })
	emptyArrayDefault: string[];

	@Column({
		type: 'varchar',
		array: true,
		nullable: false,
		default: ['a', 'b', 'c'],
	})
	filledArrayDefault: string[];

	@Column({ type: 'varchar', array: true, nullable: false, default: '{}' })
	emptyArrayDefaultString: string[];

	@Column({
		type: 'varchar',
		array: true,
		nullable: false,
		default: '{a,b,c}',
	})
	filledArrayDefaultString: string[];
}
