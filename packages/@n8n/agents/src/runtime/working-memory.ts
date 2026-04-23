import { z } from 'zod';

import type { BuiltTool } from '../types';

type ZodObjectSchema = z.ZodObject<z.ZodRawShape>;

export const UPDATE_WORKING_MEMORY_TOOL_NAME = 'updateWorkingMemory';

/**
 * The default instruction block injected into the system prompt when working memory
 * is configured. Exported so callers can reference it when building custom instructions.
 */
export const WORKING_MEMORY_DEFAULT_INSTRUCTION = [
	'You have persistent working memory that survives across conversations.',
	'Your current working memory state is shown below.',
	`When you learn new information about the user or conversation that should be remembered, call the \`${UPDATE_WORKING_MEMORY_TOOL_NAME}\` tool.`,
	'Only call it when something has actually changed — do NOT call it if nothing new was learned.',
].join('\n');

/**
 * Generate the system prompt instruction for working memory.
 * Tells the LLM to call the updateWorkingMemory tool when it has new information to persist.
 *
 * @param template - The working memory template or schema.
 * @param structured - Whether the working memory is structured (JSON schema).
 * @param instruction - Custom instruction text to replace the default. Defaults to
 *   {@link WORKING_MEMORY_DEFAULT_INSTRUCTION}.
 */
export function buildWorkingMemoryInstruction(
	template: string,
	structured: boolean,
	instruction?: string,
): string {
	const format = structured
		? 'The memory argument must be valid JSON matching the schema'
		: 'Update the template with any new information learned';

	const body = instruction ?? WORKING_MEMORY_DEFAULT_INSTRUCTION;

	return [
		'',
		'## Working Memory',
		'',
		body,
		`${format}.`,
		'',
		'Current template:',
		'```',
		template,
		'```',
	].join('\n');
}

/**
 * Convert a Zod object schema to a JSON template string for structured working memory.
 */
export function templateFromSchema(schema: ZodObjectSchema): string {
	const obj: Record<string, string> = {};
	for (const [key, field] of Object.entries(schema.shape)) {
		const desc = field.description;
		obj[key] = desc ?? '';
	}
	return JSON.stringify(obj, null, 2);
}

export interface WorkingMemoryToolConfig {
	/** Whether this is structured (Zod-schema-driven) working memory. */
	structured: boolean;
	/** Zod schema for structured working memory input validation. */
	schema?: ZodObjectSchema;
	/** Called with the serialized working memory string to persist it. */
	persist: (content: string) => Promise<void>;
}

/**
 * Build the updateWorkingMemory BuiltTool that the agent calls to persist working memory.
 *
 * For freeform working memory the input schema is `{ memory: string }`.
 * For structured working memory the input schema is the configured Zod object schema,
 * whose values are serialized to JSON before persisting.
 */
export function buildWorkingMemoryTool(config: WorkingMemoryToolConfig): BuiltTool {
	if (config.structured && config.schema) {
		const schema = config.schema;
		return {
			name: UPDATE_WORKING_MEMORY_TOOL_NAME,
			description:
				'Update your persistent working memory with new information about the user or conversation. Only call this when something has actually changed.',
			inputSchema: schema,
			handler: async (input: unknown) => {
				const content = JSON.stringify(input, null, 2);
				await config.persist(content);
				return { success: true, message: 'Working memory updated.' };
			},
		};
	}

	const freeformSchema = z.object({
		memory: z.string().describe('The updated working memory content.'),
	});

	return {
		name: UPDATE_WORKING_MEMORY_TOOL_NAME,
		description:
			'Update your persistent working memory with new information about the user or conversation. Only call this when something has actually changed.',
		inputSchema: freeformSchema,
		handler: async (input: unknown) => {
			const { memory } = input as z.infer<typeof freeformSchema>;
			await config.persist(memory);
			return { success: true, message: 'Working memory updated.' };
		},
	};
}
