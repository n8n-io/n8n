import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';

const MAX_DETAIL_LENGTH = 512;

/**
 * Client-side mirror of the backend's verification-error sanitizer, for error
 * detail that never passed through it (credential-test messages, request
 * failures). The rendered callout must be safe to screenshot and share:
 * providers can echo API keys in error messages, so scrub known secret
 * shapes, drop URL query strings, and cap the length.
 */
export function sanitizeFailureDetail(message: string): string {
	return sanitizeErrorDetail(message, MAX_DETAIL_LENGTH);
}
