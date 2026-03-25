export type Level = 'warning' | 'error' | 'fatal' | 'info';

export type ReportingOptions = {
	level?: Level;
	name?: string;
	statusCode?: number;
};

export class ApplicationError extends Error {
	level: Level;
	name: string;
	statusCode?: number;

	constructor(
		message: string,
		{ level, name, statusCode }: Partial<ErrorOptions> & ReportingOptions = {},
	) {
		super(message);
		this.level = level ?? 'error';
		this.name = name ?? 'AIServiceSDKError';
		this.statusCode = statusCode;
	}
}

export class APIResponseError extends ApplicationError {
	constructor(message: string, statusCode?: number) {
		super(message, { name: 'AIServiceAPIResponseError', level: 'error', statusCode });
	}
}

export class AuthError extends ApplicationError {
	constructor(message: string) {
		super(message, { name: 'AuthError', level: 'warning' });
	}
}
