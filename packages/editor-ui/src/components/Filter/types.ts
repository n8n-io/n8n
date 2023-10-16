import type { BaseTextKey } from '@/plugins/i18n';
export type OperatorSubjectType =
	| 'string'
	| 'number'
	| 'boolean'
	| 'array'
	| 'object'
	| 'date'
	| 'other'
	| 'any';

export interface FilterOperator {
	id: `${OperatorSubjectType}:${string}`;
	name: BaseTextKey;
	singleValue?: boolean; // default = false
}

export interface FilterOperatorGroup {
	name: BaseTextKey;
	children: Array<FilterOperator | FilterOperatorGroup>;
}
