import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { deepCopy, assert, ApplicationError } from 'n8n-workflow';

import type {
	AdjustedPutItem,
	AttributeValueType,
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

export function adjustPutItem(putItemUi: PutItemUi) {
	const adjustedPutItem: AdjustedPutItem = {};

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

		adjustedPutItem[attribute] = { [type]: value.toString() };
	});

	return adjustedPutItem;
}

export function simplify(item: IAttributeValue): IDataObject {
	const output: IDataObject = {};

	for (const [attribute, value] of Object.entries(item)) {
		const [type, content] = Object.entries(value)[0] as [AttributeValueType, string];
		//nedded as simplify is used in decodeItem

		output[attribute] = decodeAttribute(type, content);
	}

	return output;
}

function decodeAttribute(type: AttributeValueType, attribute: string | IAttributeValue) {
	switch (type) {
		case 'BOOL':
			return Boolean(attribute);
		case 'N':
			return Number(attribute);
		case 'S':
			return String(attribute);
		case 'SS':
		case 'NS':
			return attribute;
		case 'M':
			assert(
				typeof attribute === 'object' && !Array.isArray(attribute) && attribute !== null,
				'Attribute must be an object',
			);
			return simplify(attribute);
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
