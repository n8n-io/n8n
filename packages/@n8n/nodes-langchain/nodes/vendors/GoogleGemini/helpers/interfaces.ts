import type {
	GenerateContentConfig,
	GenerationConfig,
	GenerateContentParameters,
} from '@google/genai';
import type { IDataObject } from 'n8n-workflow';
export { Modality } from '@google/genai';

/* type created based on: https://ai.google.dev/api/generate-content#generationconfig */
export type GenerateContentGenerationConfig = Pick<
	GenerationConfig,
	| 'stopSequences'
	| 'responseMimeType'
	| 'responseSchema'
	| 'responseJsonSchema'
	| 'responseModalities'
	| 'candidateCount'
	| 'maxOutputTokens'
	| 'temperature'
	| 'topP'
	| 'topK'
	| 'seed'
	| 'presencePenalty'
	| 'frequencyPenalty'
	| 'responseLogprobs'
	| 'logprobs'
	| 'speechConfig'
	| 'thinkingConfig'
	| 'mediaResolution'
>;

/* Type created based on: https://ai.google.dev/api/generate-content#method:-models.streamgeneratecontent */
export interface GenerateContentRequest extends IDataObject {
	contents: GenerateContentParameters['contents'];
	tools?: GenerateContentConfig['tools'];
	toolConfig?: GenerateContentConfig['toolConfig'];
	systemInstruction?: GenerateContentConfig['systemInstruction'];
	safetySettings?: GenerateContentConfig['safetySettings'];
	generationConfig?: GenerateContentGenerationConfig;
	cachedContent?: string;
}

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
