export interface IRequestBody {
	[key: string]: string | IAttributeValue | undefined | boolean | object;
	TableName: string;
	Key?: object;
	IndexName?: string;
	ProjectionExpression?: string;
	KeyConditionExpression?: string;
	ExpressionAttributeValues?: IAttributeValue;
	ConsistentRead?: boolean;
	FilterExpression?: string;
}

export interface IAttributeValue {
	[attribute: string]: IAttributeValueValue;
}

type IAttributeValueValue = {
	[type in AttributeValueType]: string;
};

export interface IAttributeValueUi {
	attribute: string;
	type: AttributeValueType;
	value: string;
}

type AttributeValueType =
	| 'B'			// binary
	| 'BOOL'	// boolean
	| 'BS'		// binary set
	| 'L'    	// list
	| 'M' 		// map
	| 'N' 		// number
	| 'NULL'
	| 'NS'   	// number set
	| 'S' 		// string
	| 'SS';   // string set

export type PartitionKey = {
	details: {
		name: string;
		type: string;
		value: string;
	},
};
