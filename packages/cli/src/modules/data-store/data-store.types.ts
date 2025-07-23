export interface Datastore {
	id: string;
	name: string;
}

export type DataStoreColumnType = 'string' | 'number' | 'boolean' | 'date';

export interface DataStoreColumn {
	name: string;
	type: DataStoreColumnType;
}

export type DataStoreUserTableName = `dataStore_userTable_${string}`;
