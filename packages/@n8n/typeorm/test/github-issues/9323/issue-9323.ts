import { expect } from 'chai';
import 'reflect-metadata';
import {
	DataSource,
	FindManyOptions,
	FindOneOptions,
	FindOptionsUtils,
	MoreThan,
} from '../../../src';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import Activity from './entity/Activity';
import Company from './entity/Company';
import Employee from './entity/Employee';
import TimeSheet from './entity/TimeSheet';

describe('github issues > #9323 Add new VirtualColumn decorator feature', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				enabledDrivers: ['postgres'],
				schemaCreate: true,
				dropSchema: true,
				entities: [Company, Employee, TimeSheet, Activity],
			})),
	);
	after(() => closeTestingConnections(connections));

	it('should generate expected sub-select & select statement', () =>
		Promise.all(
			connections.map((connection) => {
				const metadata = connection.getMetadata(Company);
				const options1: FindManyOptions<Company> = {
					select: {
						name: true,
						totalEmployeesCount: true,
					},
				};

				const query1 = connection
					.createQueryBuilder(
						Company,
						FindOptionsUtils.extractFindManyOptionsAlias(options1) || metadata.name,
					)
					.setFindOptions(options1 || {})
					.getSql();

				expect(query1).to.eq(
					`SELECT "Company"."name" AS "Company_name", (SELECT COUNT("name") FROM "employees" WHERE "companyName" = "Company".name) AS "Company_totalEmployeesCount" FROM "companies" "Company"`,
				);
			}),
		));

	it('should generate expected sub-select & nested-subselect statement', () =>
		Promise.all(
			connections.map((connection) => {
				const metadata = connection.getMetadata(Company);
				const options1: FindManyOptions<Company> = {
					select: {
						name: true,
						totalEmployeesCount: true,
						employees: {
							timesheets: {
								totalActvityHours: true,
							},
						},
					},
					relations: {
						employees: {
							timesheets: true,
						},
					},
				};

				const query1 = connection
					.createQueryBuilder(
						Company,
						FindOptionsUtils.extractFindManyOptionsAlias(options1) || metadata.name,
					)
					.setFindOptions(options1 || {})
					.getSql();

				expect(query1).to.include(`SELECT "Company"."name" AS "Company_name"`);
				expect(query1).to.include(
					`(SELECT COUNT("name") FROM "employees" WHERE "companyName" = "Company".name) AS "Company_totalEmployeesCount", (SELECT SUM("hours") FROM "activities" WHERE "timesheetId" =`,
				);
			}),
		));

	it('should not generate sub-select if column is not selected', () =>
		Promise.all(
			connections.map((connection) => {
				const metadata = connection.getMetadata(Company);
				const options: FindManyOptions<Company> = {
					select: {
						name: true,
						totalEmployeesCount: false,
					},
				};
				const query = connection
					.createQueryBuilder(
						Company,
						FindOptionsUtils.extractFindManyOptionsAlias(options) || metadata.name,
					)
					.setFindOptions(options || {})
					.getSql();

				expect(query).to.eq(`SELECT "Company"."name" AS "Company_name" FROM "companies" "Company"`);
			}),
		));

	it('should be able to save and find sub-select data in the database', () =>
		Promise.all(
			connections.map(async (connection) => {
				const companyName = 'My Company 1';
				const company = Company.create({ name: companyName } as Company);
				await company.save();

				const employee1 = Employee.create({
					name: 'Collin 1',
					company: company,
				});
				const employee2 = Employee.create({
					name: 'John 1',
					company: company,
				});
				const employee3 = Employee.create({
					name: 'Cory 1',
					company: company,
				});
				const employee4 = Employee.create({
					name: 'Kevin 1',
					company: company,
				});
				await Employee.save([employee1, employee2, employee3, employee4]);

				const employee1TimeSheet = TimeSheet.create({
					employee: employee1,
				});
				await employee1TimeSheet.save();
				const employee1Activities: Activity[] = [
					Activity.create({
						hours: 2,
						timesheet: employee1TimeSheet,
					}),
					Activity.create({
						hours: 2,
						timesheet: employee1TimeSheet,
					}),
					Activity.create({
						hours: 2,
						timesheet: employee1TimeSheet,
					}),
				];
				await Activity.save(employee1Activities);

				const findOneOptions: FindOneOptions<Company> = {
					select: {
						name: true,
						totalEmployeesCount: true,
						employees: {
							name: true,
							timesheets: {
								id: true,
								totalActvityHours: true,
							},
						},
					},
					relations: {
						employees: {
							timesheets: true,
						},
					},
					where: {
						name: companyName,
						totalEmployeesCount: MoreThan(2),
						employees: {
							timesheets: {
								totalActvityHours: MoreThan(0),
							},
						},
					},
					order: {
						employees: {
							timesheets: {
								id: 'DESC',
								totalActvityHours: 'ASC',
							},
						},
					},
				};

				const usersUnderCompany = await Company.findOne(findOneOptions);
				expect(usersUnderCompany?.totalEmployeesCount).to.eq(4);
				const employee1TimesheetFound = usersUnderCompany?.employees
					.find((e) => e.name === employee1.name)
					?.timesheets.find((ts) => ts.id === employee1TimeSheet.id);
				expect(employee1TimesheetFound?.totalActvityHours).to.eq(6);

				const usersUnderCompanyList = await Company.find(findOneOptions);
				const usersUnderCompanyListOne = usersUnderCompanyList[0];
				expect(usersUnderCompanyListOne?.totalEmployeesCount).to.eq(4);
				const employee1TimesheetListOneFound = usersUnderCompanyListOne?.employees
					.find((e) => e.name === employee1.name)
					?.timesheets.find((ts) => ts.id === employee1TimeSheet.id);
				expect(employee1TimesheetListOneFound?.totalActvityHours).to.eq(6);
			}),
		));

	it('should be able to save and find sub-select data in the database (with query builder)', () =>
		Promise.all(
			connections.map(async (connection) => {
				const companyName = 'My Company 2';
				const company = Company.create({ name: companyName } as Company);
				await company.save();

				const employee1 = Employee.create({
					name: 'Collin 2',
					company: company,
				});
				const employee2 = Employee.create({
					name: 'John 2',
					company: company,
				});
				const employee3 = Employee.create({
					name: 'Cory 2',
					company: company,
				});
				await Employee.save([employee1, employee2, employee3]);

				const employee1TimeSheet = TimeSheet.create({
					employee: employee1,
				});
				await employee1TimeSheet.save();
				const employee1Activities: Activity[] = [
					Activity.create({
						hours: 2,
						timesheet: employee1TimeSheet,
					}),
					Activity.create({
						hours: 2,
						timesheet: employee1TimeSheet,
					}),
					Activity.create({
						hours: 2,
						timesheet: employee1TimeSheet,
					}),
				];
				await Activity.save(employee1Activities);

				const companyQueryData = await connection
					.createQueryBuilder(Company, 'company')
					.select([
						'company.name',
						'company.totalEmployeesCount',
						'employee.name',
						'timesheet.id',
						'timesheet.totalActvityHours',
					])
					.leftJoin('company.employees', 'employee')
					.leftJoin('employee.timesheets', 'timesheet')
					.where('company.name = :name', { name: companyName })
					// we won't be supporting where & order bys with VirtualColumns (you will have to make your subquery a function that gets added to the query builder)
					//.andWhere("company.totalEmployeesCount > 2")
					//.orderBy({
					//    "employees.timesheets.id": "DESC",
					//    //"employees.timesheets.totalActvityHours": "ASC",
					//})
					.getOne();

				const foundEmployee = companyQueryData?.employees.find((e) => e.name === employee1.name);
				const foundEmployeeTimeSheet = foundEmployee?.timesheets.find(
					(t) => t.id === employee1TimeSheet.id,
				);

				expect(foundEmployeeTimeSheet?.totalActvityHours).to.eq(6);
			}),
		));
});
