import type { ExecutionSetup } from '../execution-context';

export interface Redaction {
	placeholder: string;
	value: string;
}

export function secretsToRedact(context: ExecutionSetup): Redaction[] {
	return context.options.redact === false ? [] : context.redactions;
}

export function redact(text: string, secrets: Redaction[]): string {
	return secrets
		.filter(({ value }) => value !== '')
		.sort((a, b) => b.value.length - a.value.length)
		.reduce((redacted, { placeholder, value }) => redacted.replaceAll(value, placeholder), text);
}
