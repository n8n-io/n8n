import type { IDataObject } from 'n8n-workflow';

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
