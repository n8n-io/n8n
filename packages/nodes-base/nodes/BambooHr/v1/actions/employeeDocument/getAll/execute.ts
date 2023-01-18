import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function getAll(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const body: IDataObject = {};
	const requestMethod = 'GET';

	//meta data
	const id = this.getNodeParameter('employeeId', index) as string;

	//limit parameters
	const simplifyOutput: boolean = this.getNodeParameter('simplifyOutput', index) as boolean;
	const returnAll: boolean = this.getNodeParameter('returnAll', 0, false);
	const limit: number = this.getNodeParameter('limit', 0, 0);

	//endpoint
	const endpoint = `employees/${id}/files/view/`;

	//response
	const responseData = await apiRequest.call(this, requestMethod, endpoint, body);

	const onlyFilesArray = [];

	//return only files without categories
	if (simplifyOutput) {
		for (let i = 0; i < responseData.categories.length; i++) {
			if (responseData.categories[i].hasOwnProperty('files')) {
				for (let j = 0; j < responseData.categories[i].files.length; j++) {
					onlyFilesArray.push(responseData.categories[i].files[j]);
				}
			}
		}

		if (!returnAll && onlyFilesArray.length > limit) {
			return this.helpers.returnJsonArray(onlyFilesArray.slice(0, limit));
		} else {
			return this.helpers.returnJsonArray(onlyFilesArray);
		}
	}

	//return limited result
	if (!returnAll && responseData.categories.length > limit) {
		return this.helpers.returnJsonArray(responseData.categories.slice(0, limit));
	}

	//return
	return this.helpers.returnJsonArray(responseData.categories);
}
