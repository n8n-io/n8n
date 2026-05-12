import type { z } from 'zod';

type ZodObjectSchema = z.ZodObject<z.ZodRawShape>;

/**
 * The default instruction block injected into the system prompt when working memory
 * is configured. Exported so callers can reference it when building custom instructions.
 */
export const WORKING_MEMORY_DEFAULT_INSTRUCTION = [
	'You have thread working memory that is maintained automatically by an out-of-band observer.',
	'Your current working memory state is shown below. Use it as context for this conversation.',
	'Do not try to edit working memory directly. The observer updates it after turns when durable thread state changes.',
].join('\n');

/**
 * Generate the system prompt instruction for working memory.
 * Tells the LLM how to read the injected working-memory document.
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
		? 'The working memory document is valid JSON matching this schema'
		: 'The working memory document follows this template';

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
