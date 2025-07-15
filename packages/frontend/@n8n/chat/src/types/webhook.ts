export interface LoadPreviousSessionResponseItem {
	id: string[];
	kwargs: {
		content: string;
		additional_kwargs: Record<string, unknown>;
	};
	lc: number;
	type: string;
}

export interface LoadPreviousSessionResponse {
	data: LoadPreviousSessionResponseItem[];
}

export interface SendMessageResponse {
	output?: string;
	text?: string;
	type?: 'rich';
	content?: {
		html?: string;
		css?: string;
		script?: string;
		data?: Record<string, unknown>;
		components?: Array<{
			type: 'button' | 'form' | 'chart' | 'table' | 'image' | 'video' | 'iframe';
			id: string;
			props: Record<string, unknown>;
			events?: Record<string, string>;
			style?: Record<string, string>;
		}>;
		sanitize?: 'none' | 'basic' | 'strict';
	};
	data?: SendMessageResponse; // For webhook response wrapper
}
