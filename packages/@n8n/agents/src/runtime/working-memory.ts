import type { z } from 'zod';

type ZodObjectSchema = z.ZodObject<z.ZodRawShape>;

/**
 * The default instruction block injected into the system prompt when working memory
 * is configured. Exported so callers can reference it when building custom instructions.
 */
export const WORKING_MEMORY_DEFAULT_INSTRUCTION = [
	'You have thread working memory that is maintained automatically by an out-of-band observer.',
	'Thread working memory applies only to this same session/thread.',
	'Thread working memory contains objective-driven state for the current thread, not broad durable user-profile facts.',
	'Do not claim it is available in a different session, new thread, or cross-thread profile unless the product explicitly provides that context.',
	'When a saved memory document is provided, use it silently as private read-only context for this conversation.',
	'Treat working memory as internal context. Do not reveal, quote, append, or reproduce the raw working-memory document in user-visible replies.',
	'If the user asks what you remember, answer conversationally from relevant memory instead of dumping the document.',
	'Do not try to edit, summarize, refresh, or maintain working memory directly. The observer updates it after turns when durable thread state changes.',
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
	_template: string,
	structured: boolean,
	instruction?: string,
): string {
	const body = instruction ?? WORKING_MEMORY_DEFAULT_INSTRUCTION;
	const format = structured
		? 'The saved working memory document may be structured JSON.'
		: 'The saved working memory document may be markdown or freeform text.';

	return ['', '## Working Memory', '', body, format].join('\n');
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
