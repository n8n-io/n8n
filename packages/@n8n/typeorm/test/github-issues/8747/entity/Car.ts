import {
	Column,
	Entity,
	PrimaryGeneratedColumn,
	BaseEntity,
	OneToMany,
	JoinColumn,
	ManyToOne,
} from '../../../../src';
import { Record } from './Record';

@Entity()
export class Car extends BaseEntity {
	@PrimaryGeneratedColumn('uuid')
	uuid: string;

	@Column({ type: 'timestamp', precision: 3, nullable: true })
	latestRecordTimestamp?: Date;

	@OneToMany(
		() => Record,
		(record) => record.car,
	)
	records: Record[];

	@ManyToOne(() => Record)
	@JoinColumn([
		{ name: 'uuid', referencedColumnName: 'carUuid' },
		{ name: 'latestRecordTimestamp', referencedColumnName: 'timestamp' },
	])
	latestRecord?: Record;
}
