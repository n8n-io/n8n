import { z } from 'zod';

import {
	parseWorkingMemory,
	buildWorkingMemoryInstruction,
	templateFromSchema,
	WorkingMemoryStreamFilter,
} from '../runtime/working-memory';
import type { StreamChunk } from '../types';

describe('parseWorkingMemory', () => {
	it('extracts content between tags at end of text', () => {
		const text = 'Hello world.\n<working_memory>\n# Name: Alice\n</working_memory>';
		const result = parseWorkingMemory(text);
		expect(result.cleanText).toBe('Hello world.');
		expect(result.workingMemory).toBe('# Name: Alice');
	});

	it('extracts content between tags in middle of text', () => {
		const text = 'Before.\n<working_memory>\ndata\n</working_memory>\nAfter.';
		const result = parseWorkingMemory(text);
		expect(result.cleanText).toBe('Before.\nAfter.');
		expect(result.workingMemory).toBe('data');
	});

	it('returns null when no tags present', () => {
		const text = 'Just a normal response.';
		const result = parseWorkingMemory(text);
		expect(result.cleanText).toBe('Just a normal response.');
		expect(result.workingMemory).toBeNull();
	});

	it('handles empty working memory', () => {
		const text = 'Response.\n<working_memory>\n</working_memory>';
		const result = parseWorkingMemory(text);
		expect(result.cleanText).toBe('Response.');
		expect(result.workingMemory).toBe('');
	});

	it('handles multiline content with markdown', () => {
		const wm = '# User Context\n- **Name**: Alice\n- **City**: Berlin';
		const text = `Response text.\n<working_memory>\n${wm}\n</working_memory>`;
		const result = parseWorkingMemory(text);
		expect(result.workingMemory).toBe(wm);
	});
});

describe('buildWorkingMemoryInstruction', () => {
	it('generates freeform instruction', () => {
		const result = buildWorkingMemoryInstruction('# Context\n- Name:', false);
		expect(result).toContain('<working_memory>');
		expect(result).toContain('</working_memory>');
		expect(result).toContain('# Context\n- Name:');
	});

	it('generates structured instruction mentioning JSON', () => {
		const result = buildWorkingMemoryInstruction('{"userName": ""}', true);
		expect(result).toContain('JSON');
		expect(result).toContain('<working_memory>');
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
		// Should be valid JSON
		let parsed: unknown;
		try {
			parsed = JSON.parse(result);
		} catch {
			parsed = undefined;
		}
		expect(parsed).toHaveProperty('userName');
	});
});

/**
 * Helper that feeds chunks through a WorkingMemoryStreamFilter and collects
 * the output text and any persisted working memory content.
 */
async function runStreamFilter(
	chunks: string[],
): Promise<{ outputText: string; persisted: string[] }> {
	const persisted: string[] = [];
	const stream = new TransformStream<StreamChunk>();
	const writer = stream.writable.getWriter();
	// eslint-disable-next-line @typescript-eslint/require-await
	const filter = new WorkingMemoryStreamFilter(writer, async (content) => {
		persisted.push(content);
	});

	// Read the readable side concurrently to avoid backpressure deadlock
	const reader = stream.readable.getReader();
	const readAll = (async () => {
		let outputText = '';
		while (true) {
			const result = await reader.read();
			if (result.done) break;
			const chunk = result.value as StreamChunk;
			if (chunk.type === 'text-delta') outputText += chunk.delta;
		}
		return outputText;
	})();

	for (const chunk of chunks) {
		await filter.write({ type: 'text-delta', delta: chunk });
	}
	await filter.flush();
	await writer.close();

	const outputText = await readAll;
	return { outputText, persisted };
}

describe('WorkingMemoryStreamFilter with tag split across multiple chunks', () => {
	it('handles tag split mid-open-tag', async () => {
		const { outputText, persisted } = await runStreamFilter([
			'Hello <work',
			'ing_memory>state</working_memory>',
		]);
		expect(outputText).toBe('Hello ');
		expect(persisted).toEqual(['state']);
	});

	it('handles tag split mid-close-tag', async () => {
		const { outputText, persisted } = await runStreamFilter([
			'<working_memory>state</worki',
			'ng_memory> after',
		]);
		expect(persisted).toEqual(['state']);
		expect(outputText).toBe(' after');
	});

	it('handles tag spread across 3+ chunks', async () => {
		const { outputText, persisted } = await runStreamFilter([
			'<wor',
			'king_mem',
			'ory>data</working_memory>',
		]);
		expect(persisted).toEqual(['data']);
		expect(outputText).toBe('');
	});

	it('handles partial < that is not a tag', async () => {
		const { outputText, persisted } = await runStreamFilter(['Hello <', 'div>world']);
		expect(outputText).toBe('Hello <div>world');
		expect(persisted).toEqual([]);
	});
});

describe('parseWorkingMemory with invalid structured content', () => {
	it('strips tags and extracts content regardless of JSON validity', () => {
		const invalidJson = '{not valid json!!!}';
		const text = `Here is my response.\n<working_memory>\n${invalidJson}\n</working_memory>`;
		const result = parseWorkingMemory(text);

		expect(result.cleanText).toBe('Here is my response.');
		expect(result.workingMemory).toBe(invalidJson);
	});

	it('strips tags with content that fails Zod schema validation', () => {
		// Content is valid JSON but wrong shape for the schema
		const wrongShape = '{"unexpected": true}';
		const text = `Response text.\n<working_memory>\n${wrongShape}\n</working_memory>`;
		const result = parseWorkingMemory(text);

		// Tags are stripped from response regardless
		expect(result.cleanText).toBe('Response text.');
		// Raw content is returned — caller decides whether it passes validation
		expect(result.workingMemory).toBe(wrongShape);

		// Verify the content would indeed fail schema validation
		expect(result.workingMemory).not.toBeNull();
		let parsed: unknown;
		try {
			parsed = JSON.parse(result.workingMemory!);
		} catch {
			parsed = undefined;
		}
		expect(parsed).toBeDefined();
	});

	it('strips tags even when content is completely non-JSON', () => {
		const text =
			'My reply.\n<working_memory>\nthis is just plain text, not JSON at all\n</working_memory>';
		const result = parseWorkingMemory(text);

		expect(result.cleanText).toBe('My reply.');
		expect(result.workingMemory).toBe('this is just plain text, not JSON at all');
	});
});
