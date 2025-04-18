export type BaserowCredentials = {
	username: string;
	password: string;
	host: string;
};

export type GetAllAdditionalOptions = {
	order?: {
		fields: Array<{
			field: string;
			direction: string;
		}>;
	};
	filters?: {
		fields: Array<{
			field: string;
			operator: string;
			value: string;
		}>;
	};
	filterType: string;
	search: string;
};

export type LoadedResource = {
	id: number;
	name: string;
	type?: string;
};

export type Accumulator = {
	[key: string]: string;
};

export type Row = Record<string, string>;

export type FieldsUiValues = Array<{
	fieldId: string;
	fieldValue: string;
}>;

export type Operation = 'create' | 'delete' | 'update' | 'get' | 'getAll';
