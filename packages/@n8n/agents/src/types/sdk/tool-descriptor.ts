import type { JSONSchema7 } from 'json-schema';

export interface ToolDescriptor {
	name: string;
	description: string;
	inputSchema: JSONSchema7 | null;
	outputSchema: JSONSchema7 | null;
	hasSuspend: boolean;
	hasResume: boolean;
	hasToMessage: boolean;
	requireApproval: boolean;
	providerOptions: Record<string, unknown> | null;
}
