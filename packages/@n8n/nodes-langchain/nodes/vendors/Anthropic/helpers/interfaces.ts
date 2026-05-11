import type { IDataObject } from 'n8n-workflow';
import type { JsonSchema7Type } from 'zod-to-json-schema';

export type FileSource =
	| {
			type: 'base64';
			media_type: string;
			data: string;
	  }
	| {
			type: 'url';
			url: string;
	  }
	| {
			type: 'file';
			file_id: string;
	  };

export type Content =
	| {
			type: 'text';
			text: string;
	  }
	| {
			type: 'image';
			source: FileSource;
	  }
	| {
			type: 'document';
			source: FileSource;
	  }
	| {
			type: 'tool_use';
			id: string;
			name: string;
			input: IDataObject;
	  }
	| {
			type: 'tool_result';
			tool_use_id: string;
			content: string;
	  }
	| {
			type: 'container_upload';
			file_id: string;
	  };

export interface Message {
	role: 'user' | 'assistant';
	content: string | Content[];
}

export interface File {
	created_at: string;
	downloadable: boolean;
	filename: string;
	id: string;
	mime_type: string;
	size_bytes: number;
	type: 'file';
}

export type Tool =
	| {
			type: 'custom';
			name: string;
			input_schema: JsonSchema7Type;
			description: string;
	  }
	| {
			type: 'web_search_20250305';
			name: 'web_search';
			max_uses?: number;
			allowed_domains?: string[];
			blocked_domains?: string[];
	  }
	| {
			type: 'code_execution_20250522';
			name: 'code_execution';
	  };

export interface MessagesResponse {
	content: Content[];
	stop_reason: string | null;
}

export interface PromptResponse {
	messages: Message[];
	system: string;
}

export interface TemplatizeResponse extends PromptResponse {
	variable_values: IDataObject;
}
