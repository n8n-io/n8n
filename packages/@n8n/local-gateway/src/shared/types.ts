export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

export type DaemonStatus = 'stopped' | 'starting' | 'waiting' | 'connected' | 'disconnected';

export interface AppSettings {
	port: number;
	filesystemDir: string;
	filesystemEnabled: boolean;
	shellEnabled: boolean;
	screenshotEnabled: boolean;
	mouseKeyboardEnabled: boolean;
	browserEnabled: boolean;
	allowedOrigins: string[];
	logLevel: LogLevel;
}

export interface StatusSnapshot {
	status: DaemonStatus;
	connectedUrl: string | null;
	connectedAt: string | null;
}
