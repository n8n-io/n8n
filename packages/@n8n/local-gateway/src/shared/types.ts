export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

export type DaemonStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface AppSettings {
	/** User-configured origin patterns for validating instances before connect (never derived from URLs). */
	allowedOrigins: string[];
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
	lastError: string | null;
}

export interface ConnectPayload {
	url: string;
	apiKey?: string;
}
