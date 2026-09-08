import { Column } from '../../../../src/decorator/columns/Column';
import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';

export const DEFAULT_VALUE = 'default-value';

@Entity()
export class Test {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ default: DEFAULT_VALUE })
	value: string;
}
