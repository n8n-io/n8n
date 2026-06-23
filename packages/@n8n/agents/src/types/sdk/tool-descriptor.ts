import type { JSONSchema7 } from 'json-schema';

export interface ToolDescriptor {
	name: string;
	description: string;
	/**
	 * Behavioural directive paired with the tool. Persisted on the descriptor
	 * so it survives the JSON-config save → publish → reconstruct cycle for
	 * custom tools — without this, `Tool.systemInstruction(...)` would only
	 * apply to in-memory/runtime-injected tools and would silently drop on
	 * reload.
	 */
	systemInstruction: string | null;
	inputSchema: JSONSchema7 | null;
	outputSchema: JSONSchema7 | null;
	hasSuspend: boolean;
	hasResume: boolean;
	hasToMessage: boolean;
	requireApproval: boolean;
	providerOptions: Record<string, unknown> | null;
}
