export type GuardrailType = 'pii' | 'prompt-injection' | 'moderation' | 'custom';
export type GuardrailStrategy = 'block' | 'redact' | 'warn';
export type PiiDetectionType = 'email' | 'phone' | 'credit-card' | 'ssn' | 'address';

export interface BuiltGuardrail {
	readonly name: string;
	readonly guardType: 'pii' | 'prompt-injection' | 'moderation' | 'custom';
	readonly strategy: 'block' | 'redact' | 'warn';
	/** @internal */ readonly _config: Record<string, unknown>;
}
