import { scrubSecretsInText } from '../scrub-secrets';

export function sanitizeErrorDetail(message: string, maxLength: number): string {
	return scrubSecretsInText(message)
		.replace(/(https?:\/\/[^\s?]+)\?\S*/gi, '$1')
		.slice(0, maxLength);
}
