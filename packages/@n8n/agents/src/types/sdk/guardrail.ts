export type GuardrailType = 'pii' | 'prompt-injection' | 'moderation' | 'custom';
export type GuardrailStrategy = 'block' | 'redact' | 'warn';
/** Re-exported so the detection vocabulary has one definition (see `@n8n/utils`). */
export type { PiiDetectionType } from '@n8n/utils/redaction/pii-patterns';

export interface BuiltGuardrail {
	readonly name: string;
	readonly guardType: 'pii' | 'prompt-injection' | 'moderation' | 'custom';
	readonly strategy: 'block' | 'redact' | 'warn';
	/** @internal */ readonly _config: Record<string, unknown>;
}
