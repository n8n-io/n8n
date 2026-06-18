export interface IImageOptions {
	size?: string;
	promptExtend?: boolean;
}

export interface IMessage {
	role: string;
	content: string | Array<{ text?: string; image?: string }>;
	name?: string;
	tool_calls?: Array<{
		id: string;
		type: 'function';
		function: {
			name: string;
			arguments: string;
		};
	}>;
}

export interface IModelStudioRequestBody {
	model: string;
	input: {
		messages?: IMessage[];
		prompt?: string;
		img_url?: string;
		audio_url?: string;
	};
	parameters: {
		temperature?: number;
		top_p?: number;
		top_k?: number;
		max_tokens?: number;
		repetition_penalty?: number;
		stop?: string[];
		enable_search?: boolean;
		seed?: number;
		prompt_extend?: boolean;
		size?: string;
		duration?: string | number;
		resolution?: string;
		shot_type?: string;
		audio?: boolean;
		tools?: Array<{
			type: 'function';
			function: {
				name: string;
				description: string;
				parameters: unknown;
			};
		}>;
	};
}
