import type {
	FieldType,
	IDataObject,
	ILoadOptionsFunctions,
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

const airtableTypesMap: TypesMap = {
	string: ['singleLineText', 'multilineText'],
	number: [],
	boolean: ['checkbox'],
	dateTime: ['createdTime'],
	time: [],
	object: ['multipleAttachments'],
	options: ['singleSelect'],
	array: [],
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
		const type = mapForeignType(field.type, airtableTypesMap);
		fields.push({
			id: field.name,
			displayName: field.name,
			required: false,
			defaultMatch: false,
			display: true,
			type,
		});
	}

	return { fields };
}
