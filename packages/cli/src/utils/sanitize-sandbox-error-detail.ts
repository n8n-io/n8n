import { redactText } from '@n8n/utils/redaction/redact-text';

const MAX_SANDBOX_ERROR_DETAIL_CHARS = 2_000;

function truncateSandboxErrorDetail(value: string): string {
	if (value.length <= MAX_SANDBOX_ERROR_DETAIL_CHARS) return value;
	return `${value.slice(0, MAX_SANDBOX_ERROR_DETAIL_CHARS)}...[truncated]`;
}

/** Redact secrets before truncating so a match cut in half cannot leak. */
export function sanitizeSandboxErrorDetail(value: string): string {
	return truncateSandboxErrorDetail(redactText(value).text.trimEnd());
}
