export interface IRequestBody {
	[key: string]: string | IAttributeValue | undefined | boolean | object | number;
	TableName: string;
	Key?: object;
	IndexName?: string;
	ProjectionExpression?: string;
	KeyConditionExpression?: string;
	ExpressionAttributeValues?: IAttributeValue;
	ConsistentRead?: boolean;
	FilterExpression?: string;
	Limit?: number;
	ExclusiveStartKey?: IAttributeValue;
}

export interface IAttributeValue {
	[attribute: string]: IAttributeValueValue;
}

interface IAttributeValueValue {
	[type: string]: string | string[] | IAttributeValue[];
}

export interface IAttributeValueUi {
	attribute: string;
	type: AttributeValueType;
	value: string;
}

export interface IAttributeNameUi {
	key: string;
	value: string;
}

type AttributeValueType =
	| 'B' // binary
	| 'BOOL' // boolean
	| 'BS' // binary set
	| 'L' // list
	| 'M' // map
	| 'N' // number
	| 'NULL'
	| 'NS' // number set
	| 'S' // string
	| 'SS'; // string set

export type PartitionKey = {
	details: {
		name: string;
		type: string;
		value: string;
	};
};

export enum EAttributeValueType {
	S = 'S',
	SS = 'SS',
	M = 'M',
	L = 'L',
	NS = 'NS',
	N = 'N',
	BOOL = 'BOOL',
	B = 'B',
	BS = 'BS',
	NULL = 'NULL',
}

export interface IExpressionAttributeValue {
	attribute: string;
	type: EAttributeValueType;
	value: string;
}

export type FieldsUiValues = Array<{
	fieldId: string;
	fieldValue: string;
}>;

export type PutItemUi = {
	attribute: string;
	type: 'S' | 'N';
	value: string;
};

export type AdjustedPutItem = {
	[attribute: string]: {
		[type: string]: string;
	};
};
