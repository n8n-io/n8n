import { redactText, type RedactionOptions } from '../../sdk/guardrails';

/**
 * Redaction policy applied to everything written to or read by the memory
 * pipeline (observation log, reflector, episodic memory): credential/secret
 * patterns plus credit-card numbers, matching Instance AI's output-redaction
 * default. Credential IDs are untouched — only secret values match.
 */
export const MEMORY_REDACTION_OPTIONS: RedactionOptions = {
	secrets: true,
	detect: ['credit-card'],
	placeholder: '[redacted]',
};

/** Redact secrets/credit-card numbers from free-form text before it is persisted or sent to a memory LLM. */
export function redactMemoryText(text: string): string {
	return redactText(text, MEMORY_REDACTION_OPTIONS).text;
}
