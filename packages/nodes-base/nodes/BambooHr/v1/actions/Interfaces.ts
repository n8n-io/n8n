import type { AllEntities, Entity, PropertiesOf } from 'n8n-workflow';

type BambooHrMap = {
	employee: 'create' | 'get' | 'getAll' | 'update';
	employeeDocument: 'delete' | 'download' | 'get' | 'getAll' | 'update' | 'upload';
	file: 'delete' | 'download' | 'getAll' | 'update';
	companyReport: 'get';
};

export type BambooHr = AllEntities<BambooHrMap>;

export type BambooHrFile = Entity<BambooHrMap, 'file'>;
export type BambooHrEmployee = Entity<BambooHrMap, 'employee'>;
export type BambooHrEmployeeDocument = Entity<BambooHrMap, 'employeeDocument'>;
export type BambooHrCompanyReport = Entity<BambooHrMap, 'companyReport'>;

export type FileProperties = PropertiesOf<BambooHrFile>;
export type EmployeeProperties = PropertiesOf<BambooHrEmployee>;
export type EmployeeDocumentProperties = PropertiesOf<BambooHrEmployeeDocument>;
export type CompanyReportProperties = PropertiesOf<BambooHrCompanyReport>;

export interface IAttachment {
	fields: {
		item?: object[];
	};
	actions: {
		item?: object[];
	};
}
