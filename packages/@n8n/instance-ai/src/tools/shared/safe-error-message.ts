import { UserError } from 'n8n-workflow';

export function toSafeErrorMessage(
	logger: { warn(message: string, metadata?: Record<string, unknown>): void },
	error: unknown,
	fallback: string,
	logMessage: string,
): string {
	if (error instanceof UserError) return error.message;
	logger.warn(logMessage, { error: error instanceof Error ? error.message : String(error) });
	return fallback;
}
