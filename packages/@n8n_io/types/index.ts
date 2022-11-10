export type Basic = string | number | boolean;
export type Primitives = Basic | bigint | symbol;

export type Optional<T> = T | undefined | null;

export type N8nJsonSchemaType =
	| 'string'
	| 'number'
	| 'boolean'
	| 'bigint'
	| 'symbol'
	| 'date'
	| 'list'
	| 'object'
	| 'function'
	| 'null'
	| 'undefined';
export type N8nJsonSchema = { type: N8nJsonSchemaType, key?: string, value: string | N8nJsonSchema[] };
