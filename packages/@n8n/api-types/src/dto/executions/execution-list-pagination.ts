/**
 * An opaque continuation token for executions list pagination.
 * The editor must not read or construct this value. It must only pass back
 * a value it received from the server.
 */
export type SerializedCursor = string & { readonly __brand: 'SerializedCursor' };

export interface ExecutionListPaginationQuery {
	cursor?: SerializedCursor;
}

export interface ExecutionListPagination {
	nextCursor: SerializedCursor | null;
}
