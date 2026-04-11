import type { z } from 'zod';

import type { StreamChunk } from '../types';
import { createFilteredLogger } from './logger';

const logger = createFilteredLogger();

type ZodObjectSchema = z.ZodObject<z.ZodRawShape>;

const OPEN_TAG = '<working_memory>';
const CLOSE_TAG = '</working_memory>';

/**
 * Extract working memory content from an LLM response.
 * Returns the clean text (tags stripped) and the extracted working memory (or null).
 */
export function parseWorkingMemory(text: string): {
	cleanText: string;
	workingMemory: string | null;
} {
	const openIdx = text.indexOf(OPEN_TAG);
	if (openIdx === -1) return { cleanText: text, workingMemory: null };

	const closeIdx = text.indexOf(CLOSE_TAG, openIdx);
	if (closeIdx === -1) return { cleanText: text, workingMemory: null };

	const contentStart = openIdx + OPEN_TAG.length;
	const rawContent = text.slice(contentStart, closeIdx);
	const workingMemory = rawContent.replace(/^\n/, '').replace(/\n$/, '');

	const before = text.slice(0, openIdx).replace(/\n$/, '');
	const after = text.slice(closeIdx + CLOSE_TAG.length).replace(/^\n/, '');
	const cleanText = (before + (after ? '\n' + after : '')).trim();

	return { cleanText, workingMemory };
}

/**
 * Generate the system prompt instruction for working memory.
 */
export function buildWorkingMemoryInstruction(template: string, structured: boolean): string {
	const format = structured
		? 'Emit the updated state as valid JSON matching the schema'
		: 'Update the template with any new information learned';

	return [
		'',
		'## Working Memory',
		'',
		'You have persistent working memory that survives across conversations.',
		'The current state will be shown to you in a system message.',
		'IMPORTANT: Always respond to the user first with your normal reply.',
		`Then, at the very end of your response, emit your updated working memory inside ${OPEN_TAG}...${CLOSE_TAG} tags on a new line.`,
		`${format}. If nothing changed, emit the current state unchanged.`,
		'The working memory block must be the last thing in your response, after your reply to the user.',
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

type PersistFn = (content: string) => Promise<void>;

/**
 * Wraps a stream writer to intercept <working_memory> tags from text-delta chunks.
 * All non-text-delta chunks pass through unchanged.
 * Text inside the tags is buffered and persisted when the closing tag is detected.
 */
export class WorkingMemoryStreamFilter {
	private writer: WritableStreamDefaultWriter<StreamChunk>;

	private persist: PersistFn;

	private state: 'normal' | 'inside' = 'normal';

	private buffer = '';

	private pendingText = '';

	constructor(writer: WritableStreamDefaultWriter<StreamChunk>, persist: PersistFn) {
		this.writer = writer;
		this.persist = persist;
	}

	async write(chunk: StreamChunk): Promise<void> {
		if (chunk.type !== 'text-delta') {
			await this.writer.write(chunk);
			return;
		}

		this.pendingText += chunk.delta;

		while (this.pendingText.length > 0) {
			if (this.state === 'normal') {
				const openIdx = this.pendingText.indexOf(OPEN_TAG);
				if (openIdx === -1) {
					// No full open tag found. Check if the tail is a valid prefix of OPEN_TAG.
					const lastLt = this.pendingText.lastIndexOf('<');
					if (
						lastLt !== -1 &&
						this.pendingText.length - lastLt < OPEN_TAG.length &&
						OPEN_TAG.startsWith(this.pendingText.slice(lastLt))
					) {
						// Potential partial tag at end — forward everything before it, hold the rest
						if (lastLt > 0) {
							await this.writer.write({
								type: 'text-delta',
								delta: this.pendingText.slice(0, lastLt),
							});
						}
						this.pendingText = this.pendingText.slice(lastLt);
					} else {
						// No partial tag concern — forward everything
						await this.writer.write({ type: 'text-delta', delta: this.pendingText });
						this.pendingText = '';
					}
					break;
				}
				// Forward text before the tag
				if (openIdx > 0) {
					await this.writer.write({
						type: 'text-delta',
						delta: this.pendingText.slice(0, openIdx),
					});
				}
				this.state = 'inside';
				this.pendingText = this.pendingText.slice(openIdx + OPEN_TAG.length);
				this.buffer = '';
			} else {
				// Inside tag — look for closing tag
				const closeIdx = this.pendingText.indexOf(CLOSE_TAG);
				if (closeIdx === -1) {
					// Check if the tail is a valid prefix of CLOSE_TAG — hold it back
					const lastLt = this.pendingText.lastIndexOf('<');
					if (
						lastLt !== -1 &&
						this.pendingText.length - lastLt < CLOSE_TAG.length &&
						CLOSE_TAG.startsWith(this.pendingText.slice(lastLt))
					) {
						this.buffer += this.pendingText.slice(0, lastLt);
						this.pendingText = this.pendingText.slice(lastLt);
					} else {
						this.buffer += this.pendingText;
						this.pendingText = '';
					}
					break;
				}
				this.buffer += this.pendingText.slice(0, closeIdx);
				this.pendingText = this.pendingText.slice(closeIdx + CLOSE_TAG.length);
				this.state = 'normal';
				const content = this.buffer.replace(/^\n/, '').replace(/\n$/, '');
				this.persist(content).catch((error: unknown) => {
					logger.warn('Failed to persist working memory', { error });
				});
				this.buffer = '';
			}
		}
	}

	async flush(): Promise<void> {
		if (this.state === 'normal' && this.pendingText.length > 0) {
			await this.writer.write({ type: 'text-delta', delta: this.pendingText });
		}
		// Reset all state so the filter is clean for reuse after abort/completion.
		this.pendingText = '';
		this.buffer = '';
		this.state = 'normal';
	}
}
