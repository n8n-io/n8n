import type { IRedactedErrorInfo } from 'n8n-workflow';

/**
 * Format an error that n8n redacted for the viewer. Redaction keeps only the
 * error type and the HTTP status code, so the text says that details exist.
 */
export function formatRedactedError(error: IRedactedErrorInfo): string {
	// A refused run saves its error without a name, so the type can be missing.
	const type = error.type ? `${error.type} error` : 'Error';
	return `${type}${error.httpCode ? ` (${error.httpCode})` : ''} (details hidden by n8n)`;
}
