import type { BaseTextKey } from '@/plugins/i18n';
import type { FilterOperatorValue } from 'n8n-workflow';

export interface FilterOperator extends FilterOperatorValue {
	name: BaseTextKey;
}

export interface FilterOperatorGroup {
	id: string;
	name: BaseTextKey;
	icon?: string;
	children: FilterOperator[];
}
