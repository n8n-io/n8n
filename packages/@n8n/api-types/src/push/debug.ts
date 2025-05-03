export type SendConsoleMessage = {
	type: 'sendConsoleMessage';
	data: {
		source: string;
		messages: unknown[];
	};
};

export type DebugPushMessage = SendConsoleMessage;
