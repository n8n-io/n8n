import type { IDataObject } from 'n8n-workflow';

export type ChatCompletion = {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: Array<{
		index: number;
		message: {
			role: string;
			content: string;
			tool_calls?: Array<{
				id: string;
				type: 'function';
				function: {
					name: string;
					arguments: string;
				};
			}>;
		};
		finish_reason?: 'tool_calls';
	}>;
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
	system_fingerprint: string;
};

export type ThreadMessage = {
	id: string;
	object: string;
	created_at: number;
	thread_id: string;
	role: string;
	content: Array<{
		type: string;
		text: {
			value: string;
			annotations: string[];
		};
	}>;
	file_ids: string[];
	assistant_id: string;
	run_id: string;
	metadata: IDataObject;
};

export type ExternalApiCallOptions = {
	callExternalApi: boolean;
	url: string;
	path: string;
	method: string;
	requestOptions: IDataObject;
	sendParametersIn: string;
};
