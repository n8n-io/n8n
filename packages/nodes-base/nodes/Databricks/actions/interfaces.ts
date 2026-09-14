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

export type DatabricksRunNowResponse = {
	run_id: number;
	number_in_job?: number;
};

export type DatabricksJobRun = {
	job_id?: number;
	run_id?: number;
	run_name?: string;
	run_page_url?: string;
	start_time?: number;
	end_time?: number;
	status?: {
		state?: string;
		termination_details?: {
			code?: string;
			type?: string;
			message?: string;
		};
	};
	/** @deprecated Jobs API 2.2 reports `status` instead */
	state?: {
		life_cycle_state?: string;
		result_state?: string;
		state_message?: string;
	};
};
