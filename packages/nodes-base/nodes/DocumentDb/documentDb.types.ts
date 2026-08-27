export interface IDocumentDatabaseParametricCredentials {
	configurationType: 'values';
	host: string;
	database: string;
	user: string;
	password: string;
	port?: number;
}

export interface IDocumentDatabaseOverrideCredentials {
	configurationType: 'connectionString';
	connectionString: string;
	database: string;
}

export type IDocumentDatabaseCredentialsType =
	| IDocumentDatabaseParametricCredentials
	| IDocumentDatabaseOverrideCredentials;

export type IDocumentDatabaseCredentials = {
	database: string;
	connectionString: string;
};
