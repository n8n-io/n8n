import {
	ManyToOne,
	Entity,
	BaseEntity,
	PrimaryGeneratedColumn,
	VirtualColumn,
} from '../../../../src';
import Activity from './Activity';
import Employee from './Employee';

@Entity({ name: 'timesheets' })
export default class TimeSheet extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@VirtualColumn({
		query: (alias) => `SELECT SUM("hours") FROM "activities" WHERE "timesheetId" = ${alias}.id`,
	})
	totalActvityHours: number;

	@ManyToOne(
		(type) => Activity,
		(activity) => activity.timesheet,
	)
	activities: Activity[];

	@ManyToOne(
		(type) => Employee,
		(employee) => employee.timesheets,
	)
	employee: Employee;
}
