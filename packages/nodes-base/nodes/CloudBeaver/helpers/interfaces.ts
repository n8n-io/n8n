export interface AuthPayload {
	provider: string;
	credentials: Record<string, unknown>;
}

export interface IAuthProvider {
	getPayload(): AuthPayload;
}

export type GqlResponse<T = unknown> = {
	data?: T;
	errors?: Array<{ message?: string }>;
};

export type RequestFn = <T = unknown>(params: {
	query: string;
	operationName?: string;
	variables?: Record<string, unknown>;
}) => Promise<GqlResponse<T>>;

export interface IdResponse {
	id?: string;
}

export interface AsyncTaskResult {
	id: string;
	running: boolean;
	status?: string;
	error?: { message?: string; errorCode?: string; stackTrace?: string };
}

export interface SQLResultColumn {
	name?: string;
}

export interface SQLRowWithMeta {
	data: unknown[];
}

export interface SQLResultSet {
	columns?: SQLResultColumn[];
	rowsWithMetaData?: SQLRowWithMeta[];
}

export interface SQLQueryResults {
	resultSet?: SQLResultSet;
}

export interface SQLExecuteInfo {
	results?: SQLQueryResults[];
}
