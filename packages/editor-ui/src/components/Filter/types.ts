import type { BaseTextKey } from '@/plugins/i18n';
import type { FilterOperatorType } from 'n8n-workflow';

export interface FilterOperator {
	id: `${FilterOperatorType}:${string}`;
	name: BaseTextKey;
	singleValue?: boolean; // default = false
}

export interface FilterOperatorGroup {
	id: string;
	name: BaseTextKey;
	icon?: string;
	children: FilterOperator[];
}
