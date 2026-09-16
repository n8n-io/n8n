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

export type DatabricksJobRunStatus = {
	state?: string;
	termination_details?: {
		code?: string;
		type?: string;
		message?: string;
	};
};

export type DatabricksJobRunLegacyState = {
	life_cycle_state?: string;
	result_state?: string;
	state_message?: string;
};

export type DatabricksJobRunTask = {
	task_key?: string;
	run_id?: number;
	run_page_url?: string;
	start_time?: number;
	end_time?: number;
	status?: DatabricksJobRunStatus;
	state?: DatabricksJobRunLegacyState;
};

export type DatabricksJobRun = {
	job_id?: number;
	run_id?: number;
	run_name?: string;
	run_type?: string;
	run_page_url?: string;
	trigger?: string;
	creator_user_name?: string;
	start_time?: number;
	end_time?: number;
	queue_duration?: number;
	run_duration?: number;
	status?: DatabricksJobRunStatus;
	/** @deprecated Jobs API 2.2 reports `status` instead */
	state?: DatabricksJobRunLegacyState;
	tasks?: DatabricksJobRunTask[];
	has_more?: boolean;
	next_page_token?: string;
	job_parameters?: Array<{ name?: string; default?: string; value?: string }>;
};

export type DatabricksNotebookOutput = { result?: string; truncated?: boolean };

export type DatabricksRunOutput = {
	metadata?: DatabricksJobRun;
	notebook_output?: DatabricksNotebookOutput;
	sql_output?: Record<string, unknown>;
	dbt_output?: Record<string, unknown>;
	run_job_output?: { run_id?: number };
	clean_rooms_notebook_output?: { notebook_output?: DatabricksNotebookOutput };
	logs?: string;
	logs_truncated?: boolean;
	error?: string;
	error_trace?: string;
	info?: string;
};
