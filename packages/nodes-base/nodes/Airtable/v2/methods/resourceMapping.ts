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
];

const airtableTypesMap: TypesMap = {
	string: ['singleLineText', 'multilineText', 'richText', 'email', 'phoneNumber', 'url'],
	number: ['rating', 'percent', 'number', 'duration'],
	boolean: ['checkbox'],
	dateTime: ['dateTime', 'date'],
	time: [],
	object: ['multipleAttachments'],
	options: ['singleSelect'],
	array: ['multipleSelects'],
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
		throw new NodeOperationError(this.getNode(), 'Table information could not be found!');
	}

	const fields: ResourceMapperField[] = [];

	for (const field of tableData.fields as AirtableSchema[]) {
		if (airtableReadOnlyFields.includes(field.name)) continue;

		const type = mapForeignType(field.type, airtableTypesMap);
		const options =
			type === 'options' && field?.options?.choices
				? ((field.options.choices as IDataObject[]).map((choice) => ({
						name: choice.name,
						value: choice.name,
				  })) as INodePropertyOptions[])
				: undefined;
		fields.push({
			id: field.name,
			displayName: field.name,
			required: false,
			defaultMatch: false,
			display: true,
			type,
			options,
		});
	}

	return { fields };
}
