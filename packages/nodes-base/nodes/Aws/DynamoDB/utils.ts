import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { deepCopy, assert, ApplicationError } from 'n8n-workflow';

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
	LegacyAdjustedPutItem,
	ILegacyAttributeValue,
} from './types';
import { isLegacyPutItem } from './types';

const addColon = (attribute: string) =>
	(attribute = attribute.charAt(0) === ':' ? attribute : `:${attribute}`);

const addPound = (key: string) => (key = key.charAt(0) === '#' ? key : `#${key}`);

// Helper function to convert values to DynamoDB format
function convertToDynamoDBValue(value: unknown): DynamoDBAttributeValue {
	if (value === null || value === undefined) {
		return { NULL: true };
	}

	if (typeof value === 'boolean') {
		return { BOOL: value };
	}

	if (typeof value === 'number') {
		return { N: value.toString() };
	}

	if (Array.isArray(value)) {
		if (value.length === 0) {
			return { L: [] };
		}

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

	if (typeof value === 'object') {
		const map: { [key: string]: DynamoDBAttributeValue } = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			map[k] = convertToDynamoDBValue(v);
		}
		return { M: map };
	}

	return { S: String(value) };
}

type SimpleValue = string | number | boolean | null | IDataObject | SimpleValue[];
type DecodedValue = SimpleValue;

function decodeValue(type: AttributeValueType, content: unknown, version?: number): DecodedValue {
	switch (type) {
		case 'BOOL':
			return Boolean(content);
		case 'N':
			return Number(content);
		case 'S':
			return String(content);
		case 'NULL':
			return null;
		case 'SS':
			return Array.isArray(content) ? content.map(String) : [String(content)];
		case 'NS':
			return Array.isArray(content) ? content.map((n) => Number(n)) : [Number(content)];
		case 'L': {
			if (!Array.isArray(content)) return [];
			return content.map((item): SimpleValue => {
				if (typeof item === 'object' && item !== null) {
					const [itemType, itemValue] = Object.entries(item)[0] as [AttributeValueType, unknown];
					return decodeValue(itemType, itemValue, version);
				}
				return null;
			});
		}
		case 'M':
			if (typeof content === 'object' && !Array.isArray(content) && content !== null) {
				const result: IDataObject = {};
				for (const [key, value] of Object.entries(content)) {
					if (typeof value === 'object' && value !== null) {
						const [valueType, valueContent] = Object.entries(value)[0] as [
							AttributeValueType,
							unknown,
						];
						result[key] = decodeValue(valueType, valueContent, version);
					} else {
						result[key] = null;
					}
				}
				return result;
			}
			return {};
		default:
			return null;
	}
}

export function simplifyV1(item: IAttributeValue): IDataObject {
	const output: IDataObject = {};

	for (const [attribute, value] of Object.entries(item)) {
		const [type, content] = Object.entries(value)[0] as [AttributeValueType, string];
		//nedded as simplify is used in decodeItem
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		output[attribute] = decodeAttributeV1(type, content);
	}

	return output;
}

// Legacy v1 decode
function decodeAttributeV1(type: AttributeValueType, attribute: unknown): DecodedValue {
	switch (type) {
		case 'BOOL':
			return attribute === 'false' ? false : Boolean(attribute);
		case 'N':
			return Number(attribute);
		case 'S':
			return String(attribute);
		case 'SS':
		case 'NS':
			return attribute as string[];
		case 'M':
			assert(
				typeof attribute === 'object' && !Array.isArray(attribute) && attribute !== null,
				'Attribute must be an object',
			);
			// eslint-disable-next-line @typescript-eslint/no-use-before-define
			return simplify(attribute as IAttributeValue);
		default:
			return null;
	}
}

// Version 1.1 decode with support for all DynamoDB types
function decodeAttributeV1_1(type: AttributeValueType, attribute: unknown): DecodedValue {
	return decodeValue(type, attribute, 1.1);
}

// Main simplify function that delegates to the appropriate version
export function simplify(
	item: IAttributeValue | ILegacyAttributeValue,
	version?: number,
): IDataObject {
	const output: IDataObject = {};
	for (const [attribute, value] of Object.entries(item)) {
		const [type, content] = Object.entries(value)[0] as [AttributeValueType, unknown];
		const decoded =
			version === 1.1 ? decodeAttributeV1_1(type, content) : decodeAttributeV1(type, content);
		output[attribute] = decoded;
	}
	return output;
}

export function adjustExpressionAttributeValues(eavUi: IAttributeValueUi[]): IAttributeValue {
	const eav: IAttributeValue = {};

	eavUi.forEach(({ attribute, type, value }) => {
		eav[addColon(attribute)] = { [type]: value } as IAttributeValueValue;
	});

	return eav;
}

export function adjustExpressionAttributeName(eanUi: IAttributeNameUi[]): Record<string, string> {
	const ean: Record<string, string> = {};

	eanUi.forEach(({ key, value }) => {
		ean[addPound(key)] = value;
	});

	return ean;
}

// Legacy version 1 implementation
function adjustPutItemV1(putItemUi: PutItemUi): LegacyAdjustedPutItem {
	const adjustedPutItem: LegacyAdjustedPutItem = {};

	Object.entries(putItemUi).forEach(([attribute, value]) => {
		let type: string;

		if (typeof value === 'boolean') {
			type = 'BOOL';
		} else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
			type = 'M';
		} else if (isNaN(Number(value))) {
			type = 'S';
		} else {
			type = 'N';
		}

		adjustedPutItem[attribute] = { [type]: value?.toString() ?? '' };
	});

	return adjustedPutItem;
}

// Version 1.1: New behavior with proper type handling
function adjustPutItemV1_1(putItemUi: PutItemUi): AdjustedPutItem {
	if (isLegacyPutItem(putItemUi)) {
		// Convert legacy format to new format
		return {
			[putItemUi.attribute]: { [putItemUi.type]: putItemUi.value },
		} as AdjustedPutItem;
	}

	const adjustedPutItem: AdjustedPutItem = {};
	for (const [key, value] of Object.entries(putItemUi)) {
		adjustedPutItem[key] = convertToDynamoDBValue(value);
	}
	return adjustedPutItem;
}

export function adjustPutItem(
	putItemUi: PutItemUi,
	version?: number,
	typeHandling?: string,
): AdjustedPutItem {
	if (version === 1.1 && typeHandling !== 'string') {
		return adjustPutItemV1_1(putItemUi);
	}
	return adjustPutItemV1(putItemUi);
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

export function decodeItem(item: IAttributeValue, version?: number): IDataObject {
	const _item: IDataObject = {};
	for (const [attribute, value] of Object.entries(item)) {
		const [type, content] = Object.entries(value)[0] as [AttributeValueType, unknown];
		const decoded =
			version === 1.1
				? decodeAttributeV1_1(type as EAttributeValueType, content)
				: decodeAttributeV1(type as EAttributeValueType, content);
		if (decoded !== null) {
			_item[attribute] = decoded;
		}
	}

	return _item;
}
