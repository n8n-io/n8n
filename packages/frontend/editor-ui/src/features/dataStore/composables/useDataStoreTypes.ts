import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import type { DataStoreColumnType } from '@/features/dataStore/datastore.types';

/* eslint-disable id-denylist */
const COLUMN_TYPE_ICONS: Record<DataStoreColumnType, IconName> = {
	string: 'type',
	number: 'hash',
	boolean: 'toggle-right',
	date: 'calendar',
} as const;
/* eslint-enable id-denylist */

export const useDataStoreTypes = () => {
	const getIconForType = (type: DataStoreColumnType) => COLUMN_TYPE_ICONS[type];

	return {
		getIconForType,
	};
};
