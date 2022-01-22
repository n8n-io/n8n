import {
	AllEntities,
	Entity,
	PropertiesOf,
} from 'n8n-workflow';

type BambooHRMap = {
	employee: 'create' | 'get' | 'getAll' | 'update';
	employeeDocument: 'delete' | 'download' | 'get' | 'getAll' | 'update' | 'upload';
	file: 'delete' | 'download' | 'getAll' | 'update';
	companyReport: 'get';
};

export type BambooHR = AllEntities<BambooHRMap>;

export type BambooHRFile = Entity<BambooHRMap, 'file'>;
export type BambooHREmployee = Entity<BambooHRMap, 'employee'>;
export type BambooHREmployeeDocument = Entity<BambooHRMap, 'employeeDocument'>;
export type BambooHRCompanyReport = Entity<BambooHRMap, 'companyReport'>;

export type FileProperties = PropertiesOf<BambooHRFile>;
export type EmployeeProperties = PropertiesOf<BambooHREmployee>;
export type EmployeeDocumentProperties = PropertiesOf<BambooHREmployeeDocument>;
export type CompanyReportProperties = PropertiesOf<BambooHRCompanyReport>;

export interface IAttachment {
	fields: {
		item?: object[];
	};
	actions: {
		item?: object[];
	};
}
