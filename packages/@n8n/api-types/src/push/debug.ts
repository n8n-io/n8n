export type SendConsoleMessage = {
	type: 'sendConsoleMessage';
	data: {
		source: string;
		messages: unknown[];
		level?: string;
	};
};

export type DebugPushMessage = SendConsoleMessage;
