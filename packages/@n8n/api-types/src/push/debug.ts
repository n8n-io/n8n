import { LogLevel } from 'n8n-workflow';

export type SendConsoleMessage = {
	type: 'sendConsoleMessage';
	data: {
		source: string;
		messages: unknown[];
		level?: LogLevel;
	};
};

export type DebugPushMessage = SendConsoleMessage;
