/** The editor treats the cursor as an opaque continuation token. */
export interface ExecutionListPaginationQuery {
	cursor?: string;
}

export interface ExecutionListPagination {
	nextCursor: string | null;
}
