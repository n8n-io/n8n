export type ElasticsearchApiCredentials = {
	username: string;
	password: string;
	baseUrl: string;
	ignoreSSLIssues: boolean;
};

export type DocumentGetAllOptions = Partial<{
	allow_no_indices: boolean;
	allow_partial_search_results: boolean;
	batched_reduce_size: number;
	ccs_minimize_roundtrips: boolean;
	docvalue_fields: string;
	expand_wildcards: 'All' | 'Closed' | 'Hidden' | 'None' | 'Open';
	explain: boolean;
	ignore_throttled: boolean;
	ignore_unavailable: boolean;
	max_concurrent_shard_requests: number;
	pre_filter_shard_size: number;
	query: string;
	request_cache: boolean;
	routing: string;
	search_type: 'query_then_fetch' | 'dfs_query_then_fetch';
	seq_no_primary_term: boolean;
	sort: string;
	_source: boolean;
	_source_excludes: string;
	_source_includes: string;
	stats: string;
	stored_fields: boolean;
	terminate_after: boolean;
	timeout: number;
	track_scores: boolean;
	track_total_hits: string;
	version: boolean;
}>;

export type FieldsUiValues = Array<{
	fieldId: string;
	fieldValue: string;
}>;
