import { declareCapability } from '../declareCapability';

/**
 * Reads the address of the n8n Apps feedback form from a PostHog flag payload, so the
 * form can change without a release. Reads reactive state, so call it in a `computed`.
 *
 * Optional: read it with `tryUse()`. No provider or no address means the link stays hidden.
 * Provided by the shell in `capabilities.manifest.ts`.
 */
export const appsFeedbackFormUrl =
	declareCapability<() => string | undefined>('apps-feedback-form-url');
