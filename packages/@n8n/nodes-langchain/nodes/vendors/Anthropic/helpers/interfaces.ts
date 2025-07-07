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
	  };

export interface Message {
	role: 'user' | 'assistant';
	content: Content[];
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
