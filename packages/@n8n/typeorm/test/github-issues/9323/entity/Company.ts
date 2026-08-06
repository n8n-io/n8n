import { Entity, OneToMany, PrimaryColumn, VirtualColumn, BaseEntity } from '../../../../src';
import Employee from './Employee';

@Entity({ name: 'companies' })
export default class Company extends BaseEntity {
	@PrimaryColumn('varchar', { length: 50 })
	name: string;

	@VirtualColumn({
		query: (alias) => `SELECT COUNT("name") FROM "employees" WHERE "companyName" = ${alias}.name`,
	})
	totalEmployeesCount: number;

	@OneToMany(
		(type) => Employee,
		(employee) => employee.company,
	)
	employees: Employee[];
}
