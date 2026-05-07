import { z } from 'zod';

import {
	buildWorkingMemoryInstruction,
	templateFromSchema,
	WORKING_MEMORY_DEFAULT_INSTRUCTION,
} from '../working-memory';

describe('buildWorkingMemoryInstruction', () => {
	it('describes working memory as observer-maintained read-only context', () => {
		const result = buildWorkingMemoryInstruction('# Context\n- Name:', false);

		expect(result).toContain('out-of-band observer');
		expect(result).toContain('only to this same session/thread');
		expect(result).toContain('different session');
		expect(result).toContain('new thread');
		expect(result).toContain('cross-thread profile');
		expect(result).toContain('Do not try to edit, summarize, refresh, or maintain working memory');
		expect(result).toContain('Treat working memory as internal context');
		expect(result).toContain('instead of dumping the document');
	});

	it('does not include the template in the main-agent instruction', () => {
		const template = '# Context\n- Name:\n- City:';
		const result = buildWorkingMemoryInstruction(template, false);
		expect(result).not.toContain(template);
		expect(result).not.toContain('Current template');
	});

	it('keeps structured memory read-only', () => {
		const result = buildWorkingMemoryInstruction('{"name": ""}', true);
		expect(result).toContain('internal context');
		expect(result).not.toContain('{"name": ""}');
	});

	it('replaces the default instruction body when provided', () => {
		const custom = 'Use this memory as read-only context.';
		const result = buildWorkingMemoryInstruction('# Template', false, custom);
		expect(result).toContain(custom);
		expect(result).not.toContain(WORKING_MEMORY_DEFAULT_INSTRUCTION);
	});
});

describe('templateFromSchema', () => {
	it('converts Zod schema to JSON template', () => {
		const schema = z.object({
			userName: z.string().optional().describe("The user's name"),
			favoriteColor: z.string().optional().describe('Favorite color'),
		});
		const result = templateFromSchema(schema);
		expect(result).toContain('userName');
		expect(result).toContain('favoriteColor');
		let parsed: unknown;
		try {
			parsed = JSON.parse(result) as unknown;
		} catch (error) {
			throw new Error(`Expected schema template to be valid JSON: ${String(error)}`);
		}
		expect(parsed).toHaveProperty('userName');
	});
});
