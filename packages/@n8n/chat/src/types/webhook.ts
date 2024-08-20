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
}
