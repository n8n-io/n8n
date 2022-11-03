import { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { apiRequest } from '../transport';

// Get all the available channels
export async function getTimeOffTypeID(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const body: IDataObject = {};
	const requestMethod = 'GET';
	const endPoint = 'meta/time_off/types';

	const response = await apiRequest.call(this, requestMethod, endPoint, body);
	const timeOffTypeIds = response.body.timeOffTypes;

	for (const item of timeOffTypeIds) {
		returnData.push({
			name: item.name,
			value: item.id,
		});
	}
	return returnData;
}

export async function getCompanyFileCategories(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const body: IDataObject = {};
	const requestMethod = 'GET';
	const endPoint = 'files/view/';

	const response = await apiRequest.call(this, requestMethod, endPoint, body);
	const categories = response.categories;

	for (const category of categories) {
		returnData.push({
			name: category.name,
			value: category.id,
		});
	}

	returnData.sort(sort);

	return returnData;
}

export async function getEmployeeDocumentCategories(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const body: IDataObject = {};
	const requestMethod = 'GET';
	const id = this.getCurrentNodeParameter('employeeId') as string;

	const endPoint = `employees/${id}/files/view/`;

	const response = await apiRequest.call(this, requestMethod, endPoint, body);
	const categories = response.categories;

	for (const category of categories) {
		returnData.push({
			name: category.name,
			value: category.id,
		});
	}

	returnData.sort(sort);

	return returnData;
}

export async function getEmployeeLocations(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const body: IDataObject = {};
	const requestMethod = 'GET';
	const endPoint = 'meta/lists/';

	//do not request all data?
	const fields = (await apiRequest.call(this, requestMethod, endPoint, body, {})) as [
		{ fieldId: number; options: [{ id: number; name: string }] },
	];

	const options = fields.filter((field) => field.fieldId === 18)[0].options;

	for (const option of options) {
		returnData.push({
			name: option.name,
			value: option.id,
		});
	}

	returnData.sort(sort);

	return returnData;
}

export async function getDepartments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const body: IDataObject = {};
	const requestMethod = 'GET';
	const endPoint = 'meta/lists/';

	//do not request all data?
	const fields = (await apiRequest.call(this, requestMethod, endPoint, body, {})) as [
		{ fieldId: number; options: [{ id: number; name: string }] },
	];

	const options = fields.filter((field) => field.fieldId === 4)[0].options;

	for (const option of options) {
		returnData.push({
			name: option.name,
			value: option.id,
		});
	}

	returnData.sort(sort);

	return returnData;
}

export async function getDivisions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const body: IDataObject = {};
	const requestMethod = 'GET';
	const endPoint = 'meta/lists/';

	//do not request all data?
	const fields = (await apiRequest.call(this, requestMethod, endPoint, body, {})) as [
		{ fieldId: number; options: [{ id: number; name: string }] },
	];

	const options = fields.filter((field) => field.fieldId === 1355)[0].options;

	for (const option of options) {
		returnData.push({
			name: option.name,
			value: option.id,
		});
	}

	returnData.sort(sort);

	return returnData;
}

export async function getEmployeeFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const body: IDataObject = {};
	const requestMethod = 'GET';
	const endPoint = 'employees/directory';

	const { fields } = await apiRequest.call(this, requestMethod, endPoint, body);

	for (const field of fields) {
		returnData.push({
			name: field.name || field.id,
			value: field.id,
		});
	}

	returnData.sort(sort);

	returnData.unshift({
		name: '[All]',
		value: 'all',
	});

	return returnData;
}

//@ts-ignore
const sort = (a, b) => {
	if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
		return -1;
	}
	if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) {
		return 1;
	}
	return 0;
};
