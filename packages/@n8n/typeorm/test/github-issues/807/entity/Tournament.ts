import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity()
export class Tournament {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ unique: true, length: 200 })
	name: string;

	@Column()
	startDate: Date;

	@Column()
	endDate: Date;
}
