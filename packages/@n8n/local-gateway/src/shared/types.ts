export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

export type DaemonStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface AppSettings {
	instanceUrl: string;
	filesystemDir: string;
	filesystemEnabled: boolean;
	shellEnabled: boolean;
	screenshotEnabled: boolean;
	mouseKeyboardEnabled: boolean;
	browserEnabled: boolean;
	logLevel: LogLevel;
}

export interface StatusSnapshot {
	status: DaemonStatus;
	connectedUrl: string | null;
	connectedAt: string | null;
	lastError: string | null;
}

export interface ConnectPayload {
	url: string;
	apiKey?: string;
}
