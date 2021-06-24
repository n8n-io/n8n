export type BaserowCredentials = BaserowApiTokenCredentials | BaserowJwtTokenCredentials

type BaserowApiTokenCredentials = {
	authenticationMethod: 'apiToken';
	apiToken: string;
	host: string;
}

type BaserowJwtTokenCredentials = {
	authenticationMethod: 'jwtToken',
	username: string;
	password: string;
	host: string;
}

export type GetAllAdditionalOptions = {
	order?: {
		fields: Array<{ field: string; direction: string; }>
	};
	filters?: {
		fields: Array<{ field: string; operator: string; value: string; }>
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
