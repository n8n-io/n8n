import { ManyToOne, Entity, BaseEntity, PrimaryGeneratedColumn, Column } from '../../../../src';
import TimeSheet from './TimeSheet';

@Entity({ name: 'activities' })
export default class Activity extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column('int')
	hours: number;

	@ManyToOne(
		(type) => TimeSheet,
		(timesheet) => timesheet.activities,
	)
	timesheet: TimeSheet;
}
