import {
	AllEntities,
	Entity,
	PropertiesOf,
} from 'n8n-workflow';

type BambooHRMap = {
	employees: 'create' | 'get' | 'getAll' | 'update';
	employeeFile: 'addCategory' | 'del' | 'get' | 'getAll' | 'update';
	companyFile: 'addCategory' | 'del' | 'get' | 'getAll' | 'update';
	reports: 'get';
	tabularData: 'create' | 'get' | 'getAll' | 'update';
	timeOff: 'adjustTime' | 'assign' | 'changeStatus' | 'createHistory' | 'createRequest' | 'estimateFutureTime' | 'getEmployeeOut' | 'getEmployeePolicies' | 'getAllPolicies' | 'getRequests' | 'getTypes';
};

export type BambooHR = AllEntities<BambooHRMap>;

export type BambooHRCompanyFile = Entity<BambooHRMap, 'companyFile'>;
export type BambooHREmployees = Entity<BambooHRMap, 'employees'>;
export type BambooHREmployeeFile = Entity<BambooHRMap, 'employeeFile'>;
export type BambooHRReports = Entity<BambooHRMap, 'reports'>;
export type BambooHRTabularData = Entity<BambooHRMap, 'tabularData'>;
export type BambooHRTimeOff = Entity<BambooHRMap, 'timeOff'>;

export type CompanyFileProperties = PropertiesOf<BambooHRCompanyFile>;
export type EmployeesProperties = PropertiesOf<BambooHREmployees>;
export type EmployeeFileProperties = PropertiesOf<BambooHREmployeeFile>;
export type ReportsProperties = PropertiesOf<BambooHRReports>;
export type TabularDataProperties = PropertiesOf<BambooHRTabularData>;
export type TimeOffProperties = PropertiesOf<BambooHRTimeOff>;

export interface IAttachment {
	fields: {
		item?: object[];
	};
	actions: {
		item?: object[];
	};
}
