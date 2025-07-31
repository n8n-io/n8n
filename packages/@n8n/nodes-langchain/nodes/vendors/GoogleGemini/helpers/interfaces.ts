import type { IDataObject } from 'n8n-workflow';

export interface GenerateContentResponse {
	candidates: Array<{
		content: Content;
	}>;
}

export interface Content {
	parts: Part[];
	role: string;
}

export type Part =
	| { text: string }
	| {
			inlineData: {
				mimeType: string;
				data: string;
			};
	  }
	| {
			functionCall: {
				id?: string;
				name: string;
				args?: IDataObject;
			};
	  }
	| {
			functionResponse: {
				id?: string;
				name: string;
				response: IDataObject;
			};
	  }
	| {
			fileData?: {
				mimeType?: string;
				fileUri?: string;
			};
	  };

export interface ImagenResponse {
	predictions: Array<{
		bytesBase64Encoded: string;
		mimeType: string;
	}>;
}

export interface VeoResponse {
	name: string;
	done: boolean;
	error?: {
		message: string;
	};
	response: {
		generateVideoResponse: {
			generatedSamples: Array<{
				video: {
					uri: string;
				};
			}>;
		};
	};
}

export interface Tool {
	functionDeclarations?: Array<{
		name: string;
		description: string;
		parameters: IDataObject;
	}>;
	codeExecution?: object;
}
