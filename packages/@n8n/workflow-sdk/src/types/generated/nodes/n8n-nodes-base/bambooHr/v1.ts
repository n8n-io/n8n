/**
 * BambooHR Node - Version 1
 * Consume BambooHR API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get an employee */
export type BambooHrV1CompanyReportGetConfig = {
	resource: 'companyReport';
	operation: 'get';
/**
 * ID of the report. You can get the report number by hovering over the report name on the reports page and grabbing the ID.
 * @displayOptions.show { operation: ["get"], resource: ["companyReport"] }
 */
		reportId: string | Expression<string>;
/**
 * The output format for the report
 * @displayOptions.show { operation: ["get"], resource: ["companyReport"] }
 * @default JSON
 */
		format: 'CSV' | 'JSON' | 'PDF' | 'XLS' | 'XML' | Expression<string>;
/**
 * The name of the output field to put the binary file data in
 * @displayOptions.show { operation: ["get"], resource: ["companyReport"] }
 * @displayOptions.hide { format: ["JSON"] }
 * @default data
 */
		output: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Create an employee */
export type BambooHrV1EmployeeCreateConfig = {
	resource: 'employee';
	operation: 'create';
/**
 * Whether the employee to create was added to a pay schedule synced with Trax Payroll
 * @displayOptions.show { operation: ["create"], resource: ["employee"] }
 * @default false
 */
		synced: boolean | Expression<boolean>;
	firstName: string | Expression<string>;
	lastName: string | Expression<string>;
	address: {
		value?: {
			/** Line 1
			 */
			address1?: string | Expression<string>;
			/** Line 2
			 */
			address2?: string | Expression<string>;
			/** City
			 */
			city?: string | Expression<string>;
			/** The full name of the state/province
			 */
			state?: string | Expression<string>;
			/** The name of the country. Must exist in the BambooHr country list.
			 */
			country?: string | Expression<string>;
		};
	};
	dateOfBirth: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["employee"], operation: ["create"], synced: [true] }
 */
		department: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["employee"], operation: ["create"], synced: [true] }
 */
		division: string | Expression<string>;
	employeeNumber: string | Expression<string>;
	exempt: 'exempt' | 'non-exempt' | Expression<string>;
	gender: 'female' | 'male' | Expression<string>;
	hireDate: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["employee"], operation: ["create"], synced: [true] }
 */
		location: string | Expression<string>;
	maritalStatus: 'single' | 'married' | 'domesticPartnership' | Expression<string>;
	mobilePhone: string | Expression<string>;
	paidPer: 'hour' | 'day' | 'week' | 'month' | 'quater' | 'year' | Expression<string>;
	payRate: {
		value?: {
			/** Value
			 */
			value?: string | Expression<string>;
			/** Currency
			 */
			currency?: string | Expression<string>;
		};
	};
	payType: 'commission' | 'contract' | 'daily' | 'exceptionHourly' | 'hourly' | 'monthly' | 'pieceRate' | 'proRata' | 'salary' | 'weekly' | Expression<string>;
	preferredName: string | Expression<string>;
/**
 * A standard United States Social Security number, with dashes
 * @displayOptions.show { resource: ["employee"], operation: ["create"], synced: [true] }
 */
		ssn: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get an employee */
export type BambooHrV1EmployeeGetConfig = {
	resource: 'employee';
	operation: 'get';
	employeeId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many employees */
export type BambooHrV1EmployeeGetAllConfig = {
	resource: 'employee';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["employee"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["employee"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
};

/** Update an employee */
export type BambooHrV1EmployeeUpdateConfig = {
	resource: 'employee';
	operation: 'update';
	employeeId: string | Expression<string>;
/**
 * Whether the employee to create was added to a pay schedule synced with Trax Payroll
 * @displayOptions.show { operation: ["update"], resource: ["employee"] }
 * @default false
 */
		synced: boolean | Expression<boolean>;
	addasasress: {
		value?: {
			/** Line 1
			 */
			address1?: string | Expression<string>;
			/** Line 2
			 */
			address2?: string | Expression<string>;
			/** City
			 */
			city?: string | Expression<string>;
			/** The full name of the state/province
			 */
			state?: string | Expression<string>;
			/** The name of the country. Must exist in the BambooHr country list.
			 */
			country?: string | Expression<string>;
		};
	};
	dateOfBirth: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["employee"], operation: ["update"], synced: [true] }
 */
		department: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["employee"], operation: ["update"], synced: [true] }
 */
		division: string | Expression<string>;
	employeeNumber: string | Expression<string>;
	firstName: string | Expression<string>;
	lastName: string | Expression<string>;
	exempt: 'exempt' | 'non-exempt' | Expression<string>;
	gender: 'female' | 'male' | Expression<string>;
	hireDate: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["employee"], operation: ["update"], synced: [true] }
 */
		location: string | Expression<string>;
	maritalStatus: 'single' | 'married' | 'domesticPartnership' | Expression<string>;
	mobilePhone: string | Expression<string>;
	paidPer: 'hour' | 'day' | 'week' | 'month' | 'quater' | 'year' | Expression<string>;
	payRate: {
		value?: {
			/** Value
			 */
			value?: string | Expression<string>;
			/** Currency
			 */
			currency?: string | Expression<string>;
		};
	};
	payType: 'commission' | 'contract' | 'daily' | 'exceptionHourly' | 'hourly' | 'monthly' | 'pieceRate' | 'proRata' | 'salary' | 'weekly' | Expression<string>;
	preferredName: string | Expression<string>;
/**
 * A standard United States Social Security number, with dashes
 * @displayOptions.show { resource: ["employee"], operation: ["update"], synced: [true] }
 */
		ssn: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Delete an employee document */
export type BambooHrV1EmployeeDocumentDeleteConfig = {
	resource: 'employeeDocument';
	operation: 'delete';
/**
 * ID of the employee
 * @displayOptions.show { operation: ["delete"], resource: ["employeeDocument"] }
 */
		employeeId: string | Expression<string>;
/**
 * ID of the employee file
 * @displayOptions.show { operation: ["delete"], resource: ["employeeDocument"] }
 */
		fileId: string | Expression<string>;
};

/** Download an employee document */
export type BambooHrV1EmployeeDocumentDownloadConfig = {
	resource: 'employeeDocument';
	operation: 'download';
/**
 * ID of the employee
 * @displayOptions.show { operation: ["download"], resource: ["employeeDocument"] }
 */
		employeeId: string | Expression<string>;
/**
 * ID of the employee file
 * @displayOptions.show { operation: ["download"], resource: ["employeeDocument"] }
 */
		fileId: string | Expression<string>;
/**
 * The name of the output field to put the binary file data in
 * @displayOptions.show { operation: ["download"], resource: ["employeeDocument"] }
 * @default data
 */
		output: string | Expression<string>;
};

/** Get many employees */
export type BambooHrV1EmployeeDocumentGetAllConfig = {
	resource: 'employeeDocument';
	operation: 'getAll';
	employeeId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["employeeDocument"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["employeeDocument"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["getAll"], resource: ["employeeDocument"] }
 * @default true
 */
		simplifyOutput?: boolean | Expression<boolean>;
};

/** Update an employee */
export type BambooHrV1EmployeeDocumentUpdateConfig = {
	resource: 'employeeDocument';
	operation: 'update';
	employeeId: string | Expression<string>;
	fileId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Upload an employee document */
export type BambooHrV1EmployeeDocumentUploadConfig = {
	resource: 'employeeDocument';
	operation: 'upload';
/**
 * ID of the employee
 * @displayOptions.show { operation: ["upload"], resource: ["employeeDocument"] }
 */
		employeeId: string | Expression<string>;
	categoryId: string | Expression<string>;
/**
 * The name of the input field containing the binary file data to be uploaded. Supported file types: PNG, JPEG.
 * @displayOptions.show { operation: ["upload"], resource: ["employeeDocument"] }
 * @default data
 */
		binaryPropertyName: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete an employee document */
export type BambooHrV1FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
/**
 * ID of the file
 * @displayOptions.show { operation: ["delete"], resource: ["file"] }
 */
		fileId: string | Expression<string>;
};

/** Download an employee document */
export type BambooHrV1FileDownloadConfig = {
	resource: 'file';
	operation: 'download';
/**
 * ID of the file
 * @displayOptions.show { operation: ["download"], resource: ["file"] }
 */
		fileId: string | Expression<string>;
/**
 * The name of the output field to put the binary file data in
 * @displayOptions.show { operation: ["download"], resource: ["file"] }
 * @default data
 */
		output: string | Expression<string>;
};

/** Get many employees */
export type BambooHrV1FileGetAllConfig = {
	resource: 'file';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["file"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["file"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["getAll"], resource: ["file"] }
 * @default true
 */
		simplifyOutput?: boolean | Expression<boolean>;
};

/** Update an employee */
export type BambooHrV1FileUpdateConfig = {
	resource: 'file';
	operation: 'update';
/**
 * ID of the file
 * @displayOptions.show { operation: ["update"], resource: ["file"] }
 */
		fileId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Upload an employee document */
export type BambooHrV1FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
/**
 * The name of the input field containing the binary file data to be uploaded. Supported file types: PNG, JPEG.
 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
 * @default data
 */
		binaryPropertyName: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
 */
		categoryId: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type BambooHrV1Params =
	| BambooHrV1CompanyReportGetConfig
	| BambooHrV1EmployeeCreateConfig
	| BambooHrV1EmployeeGetConfig
	| BambooHrV1EmployeeGetAllConfig
	| BambooHrV1EmployeeUpdateConfig
	| BambooHrV1EmployeeDocumentDeleteConfig
	| BambooHrV1EmployeeDocumentDownloadConfig
	| BambooHrV1EmployeeDocumentGetAllConfig
	| BambooHrV1EmployeeDocumentUpdateConfig
	| BambooHrV1EmployeeDocumentUploadConfig
	| BambooHrV1FileDeleteConfig
	| BambooHrV1FileDownloadConfig
	| BambooHrV1FileGetAllConfig
	| BambooHrV1FileUpdateConfig
	| BambooHrV1FileUploadConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type BambooHrV1CompanyReportGetOutput = {
	employees?: Array<{
		fullName1?: string;
		fullName2?: string;
		hireDate?: string;
		id?: string;
		payRate?: string;
	}>;
	fields?: Array<{
		name?: string;
		type?: string;
	}>;
	title?: string;
};

export type BambooHrV1EmployeeGetOutput = {
	canUploadPhoto?: boolean;
	displayName?: string;
	firstName?: string;
	hireDate?: string;
	id?: string;
	lastName?: string;
	photoUploaded?: boolean;
	photoUrl?: string;
};

export type BambooHrV1EmployeeGetAllOutput = {
	canUploadPhoto?: number;
	department?: string;
	displayName?: string;
	firstName?: string;
	id?: string;
	jobTitle?: string;
	lastName?: string;
	location?: string;
	photoUploaded?: boolean;
	photoUrl?: string;
	pronouns?: null;
	supervisor?: string;
	workEmail?: string;
};

export type BambooHrV1EmployeeUpdateOutput = {
	success?: boolean;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface BambooHrV1Credentials {
	bambooHrApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface BambooHrV1NodeBase {
	type: 'n8n-nodes-base.bambooHr';
	version: 1;
	credentials?: BambooHrV1Credentials;
}

export type BambooHrV1CompanyReportGetNode = BambooHrV1NodeBase & {
	config: NodeConfig<BambooHrV1CompanyReportGetConfig>;
	output?: BambooHrV1CompanyReportGetOutput;
};

export type BambooHrV1EmployeeCreateNode = BambooHrV1NodeBase & {
	config: NodeConfig<BambooHrV1EmployeeCreateConfig>;
};

export type BambooHrV1EmployeeGetNode = BambooHrV1NodeBase & {
	config: NodeConfig<BambooHrV1EmployeeGetConfig>;
	output?: BambooHrV1EmployeeGetOutput;
};

export type BambooHrV1EmployeeGetAllNode = BambooHrV1NodeBase & {
	config: NodeConfig<BambooHrV1EmployeeGetAllConfig>;
	output?: BambooHrV1EmployeeGetAllOutput;
};

export type BambooHrV1EmployeeUpdateNode = BambooHrV1NodeBase & {
	config: NodeConfig<BambooHrV1EmployeeUpdateConfig>;
	output?: BambooHrV1EmployeeUpdateOutput;
};

export type BambooHrV1EmployeeDocumentDeleteNode = BambooHrV1NodeBase & {
	config: NodeConfig<BambooHrV1EmployeeDocumentDeleteConfig>;
};

export type BambooHrV1EmployeeDocumentDownloadNode = BambooHrV1NodeBase & {
	config: NodeConfig<BambooHrV1EmployeeDocumentDownloadConfig>;
};

export type BambooHrV1EmployeeDocumentGetAllNode = BambooHrV1NodeBase & {
	config: NodeConfig<BambooHrV1EmployeeDocumentGetAllConfig>;
};

export type BambooHrV1EmployeeDocumentUpdateNode = BambooHrV1NodeBase & {
	config: NodeConfig<BambooHrV1EmployeeDocumentUpdateConfig>;
};

export type BambooHrV1EmployeeDocumentUploadNode = BambooHrV1NodeBase & {
	config: NodeConfig<BambooHrV1EmployeeDocumentUploadConfig>;
};

export type BambooHrV1FileDeleteNode = BambooHrV1NodeBase & {
	config: NodeConfig<BambooHrV1FileDeleteConfig>;
};

export type BambooHrV1FileDownloadNode = BambooHrV1NodeBase & {
	config: NodeConfig<BambooHrV1FileDownloadConfig>;
};

export type BambooHrV1FileGetAllNode = BambooHrV1NodeBase & {
	config: NodeConfig<BambooHrV1FileGetAllConfig>;
};

export type BambooHrV1FileUpdateNode = BambooHrV1NodeBase & {
	config: NodeConfig<BambooHrV1FileUpdateConfig>;
};

export type BambooHrV1FileUploadNode = BambooHrV1NodeBase & {
	config: NodeConfig<BambooHrV1FileUploadConfig>;
};

export type BambooHrV1Node =
	| BambooHrV1CompanyReportGetNode
	| BambooHrV1EmployeeCreateNode
	| BambooHrV1EmployeeGetNode
	| BambooHrV1EmployeeGetAllNode
	| BambooHrV1EmployeeUpdateNode
	| BambooHrV1EmployeeDocumentDeleteNode
	| BambooHrV1EmployeeDocumentDownloadNode
	| BambooHrV1EmployeeDocumentGetAllNode
	| BambooHrV1EmployeeDocumentUpdateNode
	| BambooHrV1EmployeeDocumentUploadNode
	| BambooHrV1FileDeleteNode
	| BambooHrV1FileDownloadNode
	| BambooHrV1FileGetAllNode
	| BambooHrV1FileUpdateNode
	| BambooHrV1FileUploadNode
	;