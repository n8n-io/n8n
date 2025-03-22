import type {
	FieldType,
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { apiRequest } from '../transport';

type AirtableSchema = {
	id: string;
	name: string;
	type: string;
	options?: IDataObject;
};

type TypesMap = Partial<Record<FieldType, string[]>>;

const airtableReadOnlyFields = [
	'autoNumber',
	'button',
	'count',
	'createdBy',
	'createdTime',
	'formula',
	'lastModifiedBy',
	'lastModifiedTime',
	'lookup',
	'rollup',
	'externalSyncSource',
	'multipleLookupValues',
];

const airtableTypesMap: TypesMap = {
	string: ['singleLineText', 'multilineText', 'richText', 'email', 'phoneNumber', 'url'],
	number: ['rating', 'percent', 'number', 'duration', 'currency'],
	boolean: ['checkbox'],
	dateTime: ['dateTime', 'date'],
	time: [],
	object: [],
	options: ['singleSelect'],
	array: ['multipleSelects', 'multipleRecordLinks', 'multipleAttachments'],
};

function mapForeignType(foreignType: string, typesMap: TypesMap): FieldType {
	let type: FieldType = 'string';

	for (const nativeType of Object.keys(typesMap)) {
		const mappedForeignTypes = typesMap[nativeType as FieldType];

		if (mappedForeignTypes?.includes(foreignType)) {
			type = nativeType as FieldType;
			break;
		}
	}

	return type;
}

export async function getColumns(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
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

	const fields: ResourceMapperField[] = [];

	const constructOptions = (field: AirtableSchema) => {
		if (field?.options?.choices) {
			return (field.options.choices as IDataObject[]).map((choice) => ({
				name: choice.name,
				value: choice.name,
			})) as INodePropertyOptions[];
		}

		return undefined;
	};

	for (const field of tableData.fields as AirtableSchema[]) {
		const type = mapForeignType(field.type, airtableTypesMap);
		const isReadOnly = airtableReadOnlyFields.includes(field.type);
		const options = constructOptions(field);
		fields.push({
			id: field.name,
			displayName: field.name,
			required: false,
			defaultMatch: false,
			canBeUsedToMatch: true,
			display: true,
			type,
			options,
			readOnly: isReadOnly,
			removed: isReadOnly,
		});
	}

	return { fields };
}

export async function getColumnsWithRecordId(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const returnData = await getColumns.call(this);
	return {
		fields: [
			{
				id: 'id',
				displayName: 'id',
				required: false,
				defaultMatch: true,
				display: true,
				type: 'string',
				readOnly: true,
			},
			...returnData.fields,
		],
	};
}
