import { ManyToOne, Entity, PrimaryColumn, BaseEntity, OneToMany } from '../../../../src';
import TimeSheet from './TimeSheet';
import Company from './Company';

@Entity({ name: 'employees' })
export default class Employee extends BaseEntity {
	@PrimaryColumn('varchar', { length: 50 })
	name: string;

	@ManyToOne(
		(type) => Company,
		(company) => company.employees,
	)
	company: Company;

	@OneToMany(
		(type) => TimeSheet,
		(timesheet) => timesheet.employee,
	)
	timesheets: TimeSheet[];
}
