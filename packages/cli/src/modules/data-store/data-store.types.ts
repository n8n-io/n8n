import type { ListDataStoreQuerySortOptions } from '@n8n/api-types/src/dto/data-store/list-data-store-query.dto';
import type { ListQuery } from '@/requests';

export interface Datastore {
	id: string;
	name: string;
}

export type DataStoreColumnType = 'string' | 'number' | 'boolean' | 'date';

export interface DataStoreColumn {
	name: string;
	type: DataStoreColumnType;
}

export type DataStoreUserTableName = `data_store_user_${string}`;

export type DataStoreListFilter = {
	id?: string | string[];
	projectId?: string | string[];
	name?: string;
};

export type DataStoreListOptions = ListQuery.Options<
	DataStoreListFilter,
	never,
	ListDataStoreQuerySortOptions
>;
