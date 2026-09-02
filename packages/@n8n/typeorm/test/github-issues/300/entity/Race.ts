import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { Duration } from './Duration';

@Entity()
export class Race {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column((type) => Duration)
	duration: Duration;
}
