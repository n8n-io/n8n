import type { BaseTextKey } from '@/plugins/i18n';
import type { FilterConditionValue, FilterOperatorValue } from 'n8n-workflow';

export interface FilterOperator extends FilterOperatorValue {
	name: BaseTextKey;
}

export interface FilterOperatorGroup {
	id: string;
	name: BaseTextKey;
	icon?: string;
	children: FilterOperator[];
}

export type ConditionResult =
	| { status: 'resolve_error' }
	| { status: 'validation_error'; error: string; resolved: FilterConditionValue }
	| {
			status: 'success';
			result: boolean;
			resolved: FilterConditionValue;
	  };
