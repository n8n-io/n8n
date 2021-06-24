export type BaserowCredentials = BaserowApiTokenCredentials | BaserowJwtTokenCredentials

type BaserowApiTokenCredentials = {
	authenticationMethod: 'apiToken';
	apiToken: string;
}

type BaserowJwtTokenCredentials = {
	authenticationMethod: 'jwtToken',
	username: string;
	password: string;
}

interface IAttachment {
	url: string;
	filename: string;
	type: string;
}

export interface IRecord {
	fields: {
		[key: string]: string | IAttachment[];
	};
}

export type Mapping = { [x: string]: string };
