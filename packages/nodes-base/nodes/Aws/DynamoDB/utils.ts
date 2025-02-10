import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { deepCopy, ApplicationError } from 'n8n-workflow';

import type {
	AdjustedPutItem,
	AttributeValueType,
	DynamoDBAttributeValue,
	EAttributeValueType,
	IAttributeNameUi,
	IAttributeValue,
	IAttributeValueUi,
	IAttributeValueValue,
	PutItemUi,
} from './types';

const addColon = (attribute: string) =>
	(attribute = attribute.charAt(0) === ':' ? attribute : `:${attribute}`);

const addPound = (key: string) => (key = key.charAt(0) === '#' ? key : `#${key}`);

export function adjustExpressionAttributeValues(eavUi: IAttributeValueUi[]) {
	const eav: IAttributeValue = {};

	eavUi.forEach(({ attribute, type, value }) => {
		eav[addColon(attribute)] = { [type]: value } as IAttributeValueValue;
	});

	return eav;
}

export function adjustExpressionAttributeName(eanUi: IAttributeNameUi[]) {
	const ean: { [key: string]: string } = {};

	eanUi.forEach(({ key, value }) => {
		ean[addPound(key)] = value;
	});

	return ean;
}

function convertToDynamoDBValue(value: unknown): DynamoDBAttributeValue {
	// Handle null and undefined
	if (value === null || value === undefined) {
		return { NULL: true };
	}

	// Handle booleans
	if (typeof value === 'boolean') {
		return { BOOL: value };
	}

	// Handle numbers
	if (typeof value === 'number') {
		return { N: value.toString() };
	}

	// Handle arrays
	if (Array.isArray(value)) {
		if (value.length === 0) {
			return { L: [] };
		}

		// Check if all elements are of the same type
		const allStrings = value.every((item): item is string => typeof item === 'string');
		const allNumbers = value.every((item): item is number => typeof item === 'number');

		if (allStrings) {
			return { SS: value };
		}
		if (allNumbers) {
			return { NS: value.map(String) };
		}
		return { L: value.map(convertToDynamoDBValue) };
	}

	// Handle objects (maps)
	if (typeof value === 'object') {
		const map: { [key: string]: DynamoDBAttributeValue } = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			map[k] = convertToDynamoDBValue(v);
		}
		return { M: map };
	}

	// All strings (including numeric strings) should be stored as strings
	return { S: String(value) };
}

export function adjustPutItem(putItemUi: PutItemUi): AdjustedPutItem {
	const adjustedPutItem: AdjustedPutItem = {};

	for (const [key, value] of Object.entries(putItemUi)) {
		adjustedPutItem[key] = convertToDynamoDBValue(value);
	}

	return adjustedPutItem;
}

export function simplify(item: IAttributeValue): IDataObject {
	const output: IDataObject = {};

	for (const [attribute, value] of Object.entries(item)) {
		const [type, content] = Object.entries(value)[0] as [AttributeValueType, string];
		//nedded as simplify is used in decodeItem
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		output[attribute] = decodeAttribute(type, content);
	}

	return output;
}

function decodeAttribute(type: AttributeValueType, attribute: any): any {
	switch (type) {
		case 'BOOL':
			return Boolean(attribute);
		case 'N':
			return Number(attribute);
		case 'S':
			return String(attribute);
		case 'NULL':
			return null;
		case 'SS':
			return Array.isArray(attribute) ? attribute.map(String) : [String(attribute)];
		case 'NS':
			return Array.isArray(attribute) ? attribute.map(Number) : [Number(attribute)];
		case 'L':
			return Array.isArray(attribute)
				? attribute.map((item) => {
						if (typeof item === 'object' && item !== null) {
							const [itemType, itemValue] = Object.entries(item)[0];
							return decodeAttribute(itemType as AttributeValueType, itemValue);
						}
						return null;
					})
				: [];
		case 'M':
			if (typeof attribute === 'object' && !Array.isArray(attribute) && attribute !== null) {
				const result: IDataObject = {};
				for (const [key, value] of Object.entries(attribute)) {
					if (typeof value === 'object' && value !== null) {
						const [valueType, valueContent] = Object.entries(value)[0];
						result[key] = decodeAttribute(valueType as AttributeValueType, valueContent);
					}
				}
				return result;
			}
			return {};
		default:
			return null;
	}
}

export function validateJSON(input: any): object {
	try {
		return JSON.parse(input as string);
	} catch (error) {
		throw new ApplicationError('Items must be a valid JSON', { level: 'warning' });
	}
}

export function copyInputItem(item: INodeExecutionData, properties: string[]): IDataObject {
	// Prepare the data to insert and copy it to be returned
	const newItem: IDataObject = {};
	for (const property of properties) {
		if (item.json[property] === undefined) {
			newItem[property] = null;
		} else {
			newItem[property] = deepCopy(item.json[property]);
		}
	}
	return newItem;
}

export function mapToAttributeValues(item: IDataObject): void {
	for (const key of Object.keys(item)) {
		if (!key.startsWith(':')) {
			item[`:${key}`] = item[key];
			delete item[key];
		}
	}
}

export function decodeItem(item: IAttributeValue): IDataObject {
	const _item: IDataObject = {};
	for (const entry of Object.entries(item)) {
		const [attribute, value]: [string, object] = entry;
		const [type, content]: [string, object] = Object.entries(value)[0];
		_item[attribute] = decodeAttribute(type as EAttributeValueType, content as unknown as string);
	}

	return _item;
}
