// {"workflowId":"jbRBqnFwQQqUFbwK","startedAfter":"2023-08-01T22:00:00.000Z","startedBefore":"2023-08-31T22:00:00.000Z","status":["success"]}
// {"workflowId":"jbRBqnFwQQqUFbwK","metadata":[{"key":"1","value":"2"}],"startedAfter":"2023-08-01T22:00:00.000Z","startedBefore":"2023-08-31T22:00:00.000Z","status":["success"]}

/*
{
	"workflowId": "jbRBqnFwQQqUFbwK",
	"startedAfter": "2023-08-01T22:00:00.000Z",
	"startedBefore": "2023-08-31T22:00:00.000Z",
	"status": ["success"],
	"metadata":[{"key":"1","value":"2"}]
}

export type ExecutionsQueryFilter = {
	workflowId?: string;
	startedAfter?: string;
	startedBefore?: string;
	status?: ExecutionStatus[];
	metadata?: Array<{ key: string; value: string }>;

  -> finished?: boolean;
	-> waitTill?: boolean;
};

*/

import { isObjectLiteral } from '@/utils';
import {
	IsArray,
	IsDate,
	IsIn,
	IsOptional,
	IsString,
	validateSync as classValidatorValidate,
} from 'class-validator';

export class ExecutionFilterDtoValidator {
	@IsString()
	@IsOptional()
	workflowId?: string;

	@IsDate()
	@IsOptional()
	startedAfter?: string;

	@IsDate()
	@IsOptional()
	startedBefore?: string;

	// TODO: make sure we are using the correct type here
	@IsArray()
	@IsIn([
		'canceled',
		'crashed',
		'error',
		'failed',
		'new',
		'running',
		'success',
		'unknown',
		'waiting',
		'warning',
	])
	@IsOptional()
	status?: string[];

	@IsArray()
	@IsOptional()
	metadata?: Array<{ key: string; value: string }>;

	static get filterableFields() {
		return new Set(['workflowId', 'startedAfter', 'startedBefore', 'status', 'metadata']);
	}

	static validate(data: unknown) {
		if (!isObjectLiteral(data)) throw new Error('Filter must be an object literal');

		const onlyKnownFields = Object.fromEntries(
			Object.entries(data).filter(([key]) => this.filterableFields.has(key)),
		);

		console.log('data', data);
		const result = classValidatorValidate(onlyKnownFields);

		console.log('result', result);

		if (result.length > 0) throw new Error('Parsed filter does not fit the schema');

		return onlyKnownFields;
	}
}
