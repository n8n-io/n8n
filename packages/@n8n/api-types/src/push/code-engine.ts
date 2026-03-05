export type CodeEngineNodeBefore = {
	type: 'codeEngineNodeBefore';
	data: {
		nodeId: string;
		label: string;
		input: unknown;
	};
};

export type CodeEngineNodeAfter = {
	type: 'codeEngineNodeAfter';
	data: {
		nodeId: string;
		label: string;
		output: unknown;
		durationMs: number;
		error?: string;
	};
};

export type CodeEngineFinished = {
	type: 'codeEngineFinished';
	data: {
		trace: {
			nodes: Array<{
				id: string;
				label: string;
				type: 'trigger' | 'callable';
				input: unknown;
				output: unknown;
				startedAt: number;
				completedAt: number;
				error?: string;
			}>;
			edges: Array<{
				from: string;
				to: string;
			}>;
			startedAt: number;
			completedAt: number;
			status: 'success' | 'error';
			error?: string;
		};
	};
};

export type CodeEngineWebhookDeleted = {
	type: 'codeEngineWebhookDeleted';
	data: Record<string, never>;
};

export type CodeEnginePushMessage =
	| CodeEngineNodeBefore
	| CodeEngineNodeAfter
	| CodeEngineFinished
	| CodeEngineWebhookDeleted;
