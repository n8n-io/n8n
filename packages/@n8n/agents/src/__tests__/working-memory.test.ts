import { z } from 'zod';

import {
	buildWorkingMemoryInstruction,
	buildWorkingMemoryTool,
	templateFromSchema,
	UPDATE_WORKING_MEMORY_TOOL_NAME,
	WORKING_MEMORY_DEFAULT_INSTRUCTION,
} from '../runtime/working-memory';

describe('buildWorkingMemoryInstruction', () => {
	it('mentions the updateWorkingMemory tool name', () => {
		const result = buildWorkingMemoryInstruction('# Context\n- Name:', false);
		expect(result).toContain(UPDATE_WORKING_MEMORY_TOOL_NAME);
	});

	it('instructs the model to call the tool only when something changed', () => {
		const result = buildWorkingMemoryInstruction('# Context\n- Name:', false);
		expect(result).toContain('Only call it when something has actually changed');
	});

	it('includes the template in the instruction', () => {
		const template = '# Context\n- Name:\n- City:';
		const result = buildWorkingMemoryInstruction(template, false);
		expect(result).toContain(template);
	});

	it('mentions JSON for structured variant', () => {
		const result = buildWorkingMemoryInstruction('{"name": ""}', true);
		expect(result).toContain('JSON');
	});

	describe('custom instruction', () => {
		it('replaces the default instruction body when provided', () => {
			const custom = 'Always update working memory after every message.';
			const result = buildWorkingMemoryInstruction('# Template', false, custom);
			expect(result).toContain(custom);
			expect(result).not.toContain(WORKING_MEMORY_DEFAULT_INSTRUCTION);
		});

		it('still includes the ## Working Memory heading', () => {
			const result = buildWorkingMemoryInstruction('# Template', false, 'Custom text.');
			expect(result).toContain('## Working Memory');
		});

		it('still includes the template block', () => {
			const template = '# Context\n- Name:\n- City:';
			const result = buildWorkingMemoryInstruction(template, false, 'Custom text.');
			expect(result).toContain(template);
		});

		it('still includes the format hint for structured memory', () => {
			const result = buildWorkingMemoryInstruction('{}', true, 'Custom text.');
			expect(result).toContain('JSON');
		});

		it('still includes the format hint for freeform memory', () => {
			const result = buildWorkingMemoryInstruction('# Template', false, 'Custom text.');
			expect(result).toContain('Update the template with any new information learned');
		});

		it('uses the default instruction when undefined is passed explicitly', () => {
			const withDefault = buildWorkingMemoryInstruction('# Template', false, undefined);
			const withoutArg = buildWorkingMemoryInstruction('# Template', false);
			expect(withDefault).toBe(withoutArg);
		});

		it('WORKING_MEMORY_DEFAULT_INSTRUCTION appears in the output when no custom instruction is set', () => {
			const result = buildWorkingMemoryInstruction('# Template', false);
			expect(result).toContain(WORKING_MEMORY_DEFAULT_INSTRUCTION);
		});
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
			parsed = JSON.parse(result);
		} catch {
			parsed = undefined;
		}
		expect(parsed).toHaveProperty('userName');
	});
});

describe('buildWorkingMemoryTool — freeform', () => {
	it('returns a BuiltTool with the correct name', () => {
		const tool = buildWorkingMemoryTool({
			structured: false,
			persist: async () => {},
		});
		expect(tool.name).toBe(UPDATE_WORKING_MEMORY_TOOL_NAME);
	});

	it('has a description', () => {
		const tool = buildWorkingMemoryTool({
			structured: false,
			persist: async () => {},
		});
		expect(tool.description).toBeTruthy();
	});

	it('has a freeform input schema with a memory field', () => {
		const tool = buildWorkingMemoryTool({
			structured: false,
			persist: async () => {},
		});
		expect(tool.inputSchema).toBeDefined();
		const schema = tool.inputSchema as z.ZodObject<z.ZodRawShape>;
		const result = schema.safeParse({ memory: 'hello' });
		expect(result.success).toBe(true);
	});

	it('rejects input without memory field', () => {
		const tool = buildWorkingMemoryTool({
			structured: false,
			persist: async () => {},
		});
		const schema = tool.inputSchema as z.ZodObject<z.ZodRawShape>;
		const result = schema.safeParse({ other: 'value' });
		expect(result.success).toBe(false);
	});

	it('handler calls persist with the memory string', async () => {
		const persisted: string[] = [];
		const tool = buildWorkingMemoryTool({
			structured: false,
			// eslint-disable-next-line @typescript-eslint/require-await
			persist: async (content) => {
				persisted.push(content);
			},
		});
		const result = await tool.handler!({ memory: 'test content' }, {} as never);
		expect(persisted).toEqual(['test content']);
		expect(result).toMatchObject({ success: true });
	});
});

describe('buildWorkingMemoryTool — structured', () => {
	const schema = z.object({
		userName: z.string().optional().describe("The user's name"),
		location: z.string().optional().describe('Where the user lives'),
	});

	it('uses the Zod schema as input schema', () => {
		const tool = buildWorkingMemoryTool({
			structured: true,
			schema,
			persist: async () => {},
		});
		const inputSchema = tool.inputSchema as typeof schema;
		const result = inputSchema.safeParse({ userName: 'Alice', location: 'Berlin' });
		expect(result.success).toBe(true);
	});

	it('handler serializes input to JSON and calls persist', async () => {
		const persisted: string[] = [];
		const tool = buildWorkingMemoryTool({
			structured: true,
			schema,
			// eslint-disable-next-line @typescript-eslint/require-await
			persist: async (content) => {
				persisted.push(content);
			},
		});

		const input = { userName: 'Alice', location: 'Berlin' };
		await tool.handler!(input, {} as never);

		expect(persisted).toHaveLength(1);
		let parsed: unknown;
		try {
			parsed = JSON.parse(persisted[0]) as unknown;
		} catch {
			parsed = undefined;
		}
		expect(parsed).toMatchObject(input);
	});

	it('handler returns success confirmation', async () => {
		const tool = buildWorkingMemoryTool({
			structured: true,
			schema,
			persist: async () => {},
		});
		const result = await tool.handler!({ userName: 'Alice' }, {} as never);
		expect(result).toMatchObject({ success: true });
	});

	it('falls back to freeform when no schema provided despite structured:true', () => {
		const tool = buildWorkingMemoryTool({
			structured: true,
			persist: async () => {},
		});
		const inputSchema = tool.inputSchema as z.ZodObject<z.ZodRawShape>;
		const result = inputSchema.safeParse({ memory: 'fallback text' });
		expect(result.success).toBe(true);
	});
});
