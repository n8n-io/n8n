import {
	AllEntities,
	Entity,
	PropertiesOf,
} from 'n8n-workflow';

type BambooHRMap = {
  employees: 'create';
};

export type BambooHR = AllEntities<BambooHRMap>;

export type BambooHREmployees = Entity<BambooHRMap, 'employees'>;

export type EmployeesProperties = PropertiesOf<BambooHREmployees>;


export interface IAttachment {
	fields: {
		item?: object[];
	};
	actions: {
		item?: object[];
	};
}
