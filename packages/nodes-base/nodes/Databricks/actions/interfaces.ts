export interface DatabricksCredentials {
	host: string;
}

export interface DatabricksStatementResponse {
	statement_id: string;
	status: {
		state: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
		error?: {
			error_code: string;
			message: string;
		};
	};
	manifest?: {
		total_chunk_count?: number;
		schema?: {
			columns: Array<{ name: string; type: string }>;
		};
	};
	result?: {
		data_array?: unknown[][];
	};
}

export interface OpenAPISchema {
	servers?: Array<{
		url: string;
	}>;
	paths: {
		[path: string]: {
			post?: {
				requestBody?: {
					content?: {
						'application/json'?: {
							schema?: {
								oneOf?: Array<{
									type: string;
									properties: Record<string, unknown>;
								}>;
								properties?: Record<string, unknown>;
							};
						};
					};
				};
			};
		};
	};
}
