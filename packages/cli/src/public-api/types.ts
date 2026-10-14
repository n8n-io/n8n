type PaginationBase = { limit: number };

export type PaginationOffsetDecoded = PaginationBase & { offset: number };

export type PaginationCursorDecoded = PaginationBase & { lastId: string };

export type OffsetPagination = PaginationBase & { offset: number; numberOfTotalRecords: number };

export type CursorPagination = PaginationBase & { lastId: string; numberOfNextRecords: number };

interface IRequired {
	required?: string[];
}
export interface IDependency {
	if?: { properties: {}; required?: string[] };
	then?: { allOf: IRequired[] };
}

export interface IJsonSchema {
	additionalProperties: false;
	type: 'object';
	properties: { [key: string]: { type: string } };
	allOf?: IDependency[];
	required: string[];
}
