import type { ListDataStoreQueryDto } from '@n8n/api-types/src/dto/data-store/list-data-store-query.dto';

export type DataStoreUserTableName = `data_store_user_${string}`;

export type DataStoreListFilter = {
	id?: string | string[];
	projectId?: string | string[];
	name?: string;
};

export type DataStoreListOptions = Partial<ListDataStoreQueryDto> & {
	filter: { projectId: string };
};

export type DataStoreColumnJsType = string | number | boolean | Date;

export type DataStoreRows = Array<Record<PropertyKey, DataStoreColumnJsType | null>>;
