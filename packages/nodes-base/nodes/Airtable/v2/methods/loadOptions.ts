import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest } from '../transport';

export async function getColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const base = this.getNodeParameter('base', undefined, {
		extractValue: true,
	}) as string;

	const tableId = encodeURI(
		this.getNodeParameter('table', undefined, {
			extractValue: true,
		}) as string,
	);

	const response = await apiRequest.call(this, 'GET', `meta/bases/${base}/tables`);

	const tableData = ((response.tables as IDataObject[]) || []).find((table: IDataObject) => {
		return table.id === tableId;
	});

	if (!tableData) {
		throw new NodeOperationError(this.getNode(), 'Table information could not be found!', {
			level: 'warning',
		});
	}


	 const DEFAULTS = {
    useFieldIDs: false,
   };

  const useFieldIDs = (this.getNodeParameter('useFieldIDs') ?? DEFAULTS.useFieldIDs) as boolean;

	const result: INodePropertyOptions[] = [];

	for (const field of tableData.fields as IDataObject[]) {

		const fieldId  = useFieldIDs ? field.id : undefined;

		result.push({
			name: field.name as string,
			value: field.name as string,
			description: `Type: ${field.type}`,
			id: fieldId,
		});
	}

	return result;
}

export async function getColumnsWithRecordId(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData = await getColumns.call(this);
	return [
		{
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased-id, n8n-nodes-base/node-param-display-name-miscased
			name: 'id',
			value: 'id' as string,
			description: 'Type: primaryFieldId',
		},
		...returnData,
	];
}

export async function getColumnsWithoutColumnToMatchOn(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const columnToMatchOn = this.getNodeParameter('columnToMatchOn') as string;
	const returnData = await getColumns.call(this);
	return returnData.filter((column) => column.value !== columnToMatchOn);
}

export async function getAttachmentColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const base = this.getNodeParameter('base', undefined, {
		extractValue: true,
	}) as string;

	const tableId = encodeURI(
		this.getNodeParameter('table', undefined, {
			extractValue: true,
		}) as string,
	);

	const response = await apiRequest.call(this, 'GET', `meta/bases/${base}/tables`);

	const tableData = ((response.tables as IDataObject[]) || []).find((table: IDataObject) => {
		return table.id === tableId;
	});

	if (!tableData) {
		throw new NodeOperationError(this.getNode(), 'Table information could not be found!', {
			level: 'warning',
		});
	}

	const result: INodePropertyOptions[] = [];

	for (const field of tableData.fields as IDataObject[]) {
		if (!(field.type as string)?.toLowerCase()?.includes('attachment')) {
			continue;
		}
		result.push({
			name: field.name as string,
			value: field.name as string,
			description: `Type: ${field.type}`,
		});
	}

	return result;
}



/**
 * Fetches the field IDs for a specific table in a given base.
 *
 * This function retrieves field information from the Airtable API and returns a mapping of field names to their corresponding field IDs.
 * It is primarily used for mapping fields in Airtable tables, allowing users to reference fields by their IDs rather than names.
 *
 * @param {ILoadOptionsFunctions} this - The context in which the function is called, providing access to node parameters.
 * @returns {Promise<Record<string, string>>} A promise that resolves to a record containing field names as keys and their corresponding field IDs as values.
 * @throws {NodeOperationError} Throws an error if the response from the Airtable API is invalid or does not contain the expected data structure.
 *
 * @example
 * const fieldIds = await getFieldIds.call(this);
 * console.log(fieldIds); // { "Name": "fld12345", "Email": "fld67890", ... }
 */

interface Field {
	id: string;
	name: string;
}

export async function getFieldIds(this: ILoadOptionsFunctions): Promise<Record<string, string>> {


	const baseId = this.getNodeParameter('baseId', undefined) as string;
	const tableId = encodeURI(this.getNodeParameter('tableId', undefined) as string);

	try {
			const response = await apiRequest.call(this, 'GET', `meta/bases/${baseId}/tables/${tableId}/fields`);


			if (!response || !Array.isArray(response.fields)) {
					throw new NodeOperationError(this.getNode(), 'Invalid response structure: "fields" should be an array of objects with "name" and "id".', {
							level: 'error',
					});
			}


			const fieldIds: Record<string, string> = response.fields.reduce((map: Record<string, string>, field: Field) => {
					if (typeof field.name !== 'string' || typeof field.id !== 'string') {
							throw new NodeOperationError(this.getNode(), 'Invalid field data: each field must have a "name" and "id" as strings.', {
									level: 'error',
							});
					}

					if (map[field.name]) {

							return map;
					}

					map[field.name] = field.id;
					return map;
			}, {});

			return fieldIds;
	} catch (error) {
			if (error instanceof NodeOperationError) {
					throw error;
			}


			throw new NodeOperationError(this.getNode(), `Error fetching field IDs from Airtable: ${error.message || error}`, {
					level: 'error',
			});
	}
}
