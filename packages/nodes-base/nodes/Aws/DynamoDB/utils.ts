import {
	IDataObject,
	IExecuteFunctions,
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

export function populatePartitionKey(this: IExecuteFunctions, i: number) {
	const partitionKey = this.getNodeParameter('partitionKey', i) as PartitionKey;

	if (!partitionKey.details) {
		throw new Error('Please specify name, type and value of the partition key for the item to retrieve.');
	}

	const { name, type, value } = partitionKey.details;

	if ([name, type, value].some(property => property === undefined)) {
		throw new Error('Please specify name, type and value of the partition key for the item to retrieve.');
	}

	return {
		[name]: {
			[type]: value,
		},
	};
}
