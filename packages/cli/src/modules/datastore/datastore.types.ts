export interface Datastore {
	id: string;
	name: string;
}

export type DatastoreFieldType = 'string' | 'number' | 'boolean' | 'date';

export interface DatastoreField {
	name: string;
	type: DatastoreFieldType;
}
