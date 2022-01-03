import {
	AllEntities,
	Entity,
	PropertiesOf,
} from 'n8n-workflow';

type BambooHRMap = {
	employee: 'create' | 'get' | 'getAll' | 'update';
	employeeFile: 'del' | 'download' | 'getAll' | 'update' | 'upload';
	companyFile: 'del' | 'download' | 'getAll' | 'update';
	report: 'get';
	tabularData: 'create' | 'get' | 'getAll' | 'update';
	timeOff: 'adjustTime' | 'assign' | 'changeStatus' | 'createHistory' | 'createRequest' | 'estimateFutureTime' | 'getEmployeeOut' | 'getEmployeePolicies' | 'getAllPolicies' | 'getRequests' | 'getTypes';
};

export type BambooHR = AllEntities<BambooHRMap>;

export type BambooHRCompanyFile = Entity<BambooHRMap, 'companyFile'>;
export type BambooHREmployee = Entity<BambooHRMap, 'employee'>;
export type BambooHREmployeeFile = Entity<BambooHRMap, 'employeeFile'>;
export type BambooHRReport = Entity<BambooHRMap, 'report'>;
export type BambooHRTabularData = Entity<BambooHRMap, 'tabularData'>;
export type BambooHRTimeOff = Entity<BambooHRMap, 'timeOff'>;

export type CompanyFileProperties = PropertiesOf<BambooHRCompanyFile>;
export type EmployeeProperties = PropertiesOf<BambooHREmployee>;
export type EmployeeFileProperties = PropertiesOf<BambooHREmployeeFile>;
export type ReportProperties = PropertiesOf<BambooHRReport>;
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
