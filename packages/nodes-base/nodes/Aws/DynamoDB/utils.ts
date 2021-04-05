import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	isEmpty,
} from 'lodash';

import {
	AttributeValueType,
	IAttributeValue,
	IAttributeValueUi,
	IAttributeValueValue,
	PartitionKey,
} from './types';

const addColon = (attribute: string) => attribute = attribute.charAt(0) === ':' ? attribute : `:${attribute}`;

export function adjustExpressionAttributeValues(eavUi: IAttributeValueUi[]) {
	if (isEmpty(eavUi)) {
		throw new Error('Expression attribute values must not be empty.');
	}

	const eav: IAttributeValue = {};

	eavUi.forEach(({ attribute, type, value }) => {
		eav[addColon(attribute)] = { [type]: value } as IAttributeValueValue;
	});

	return eav;
}

export function simplify(item: IAttributeValue): IDataObject {
	const output: IDataObject = {};

	for (const [attribute, value] of Object.entries(item)) {
		const [type, content] = Object.entries(value)[0] as [AttributeValueType, string];
		output[attribute] = decodeAttribute(type, content);
	}

	return output;
}

function decodeAttribute(type: AttributeValueType, attribute: string) {
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
		default:
			return null;
	}
}

// tslint:disable-next-line: no-any
export function validateJSON(input: any): object {
	try {
		return JSON.parse(input);
	} catch (error) {
		throw new Error('Items must be a valid JSON');
	}
}

// export function populatePartitionKey(this: IExecuteFunctions, i: number) {
// 	const keys = this.getNodeParameter('keyUi.keyValues', i) as IDataObject[];;

// 	return {
// 		[name]: {
// 			[type]: value,
// 		},
// 	};
// }

export function copyInputItem(item: INodeExecutionData, properties: string[]): IDataObject {
	// Prepare the data to insert and copy it to be returned
	let newItem: IDataObject;
		newItem = {};
	for (const property of properties) {
		if (item.json[property] === undefined) {
			newItem[property] = null;
		} else {
			newItem[property] = JSON.parse(JSON.stringify(item.json[property]));
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
