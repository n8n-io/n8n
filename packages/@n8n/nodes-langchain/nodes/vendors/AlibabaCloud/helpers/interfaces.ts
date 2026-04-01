import { IDataObject } from 'n8n-workflow';

export interface IImageOptions {
	size: string;
	prompt_extend?: boolean;
}

export interface IMessage {
	role: string;
	content: string | Array<{ text?: string; image?: string }>;
}

export interface IModelStudioRequestBody extends IDataObject {
	model: string;
	input: {
		messages?: IMessage[];
		prompt?: string;
		// Image-to-video
		img_url?: string;
		// Video audio
		audio_url?: string;
	};
	parameters: {
		// Shared
		temperature?: number;
		top_p?: number;
		top_k?: number;
		max_tokens?: number;
		// Text generation
		repetition_penalty?: number;
		stop?: string[];
		enable_search?: boolean;
		seed?: number;
		// Image generation
		prompt_extend?: boolean;
		size?: string;
		// Video generation
		duration?: string | number;
		resolution?: string;
		shot_type?: string;
		audio?: boolean;
	};
}
