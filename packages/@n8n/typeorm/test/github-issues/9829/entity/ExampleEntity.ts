import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';

@Entity()
export class ExampleEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		type: 'varchar',
		length: 3,
		unique: true,
		default: () => "('AA'|| COALESCE(NULL, '1'))",
	})
	someValue: string;
}
