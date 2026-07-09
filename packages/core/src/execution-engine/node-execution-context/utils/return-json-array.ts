import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

/**
 * Takes generic input data and brings it into the json format n8n uses.
 *
 * @param {(IDataObject | IDataObject[])} jsonData
 */
export function returnJsonArray(jsonData: IDataObject | IDataObject[]): INodeExecutionData[] {
	const returnData: INodeExecutionData[] = [];

	if (!Array.isArray(jsonData)) {
		jsonData = [jsonData];
	}

	jsonData.forEach((data: IDataObject & { json?: IDataObject }) => {
		if (data?.json) {
			// We already have the JSON key so avoid double wrapping
			returnData.push({ ...data, json: data.json });
		} else {
			returnData.push({ json: data });
		}
	});

	return returnData;
}
