export type BaserowCredentials = {
	username: string;
	password: string;
	host: string;
}

export type GetAllAdditionalOptions = {
	order?: {
		fields: Array<{
			field: string;
			direction: string;
		}>
	};
	filters?: {
		fields: Array<{
			field: string;
			operator: string;
			value: string;
		}>;
	};
};

export type TableField = {
	name: string;
	id: number;
}

export type Accumulator = {
	[key: string]: string;
}

export type Row = Record<string, string>
