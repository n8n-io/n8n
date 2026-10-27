import type { BuiltTool } from '@n8n/agents';
import { z } from 'zod';

import { formatContextBudget, measureContextBudget } from '../context-budget';

function tool(overrides: Partial<BuiltTool> & Pick<BuiltTool, 'name'>): BuiltTool {
	return { description: '', ...overrides };
}

describe('measureContextBudget', () => {
	it('counts the system prompt and the skill catalog as separate sections', () => {
		const budget = measureContextBudget({
			systemPrompt: 'a'.repeat(400),
			skillCatalog: 'b'.repeat(80),
			tools: [],
		});

		expect(budget.sections).toEqual([
			{ name: 'system prompt', chars: 400, tokens: 100 },
			{ name: 'skill catalog', chars: 80, tokens: 20 },
			{ name: 'tools', chars: 0, tokens: 0 },
			{ name: 'tool system instructions', chars: 0, tokens: 0 },
		]);
		expect(budget.total).toEqual({ chars: 480, tokens: 120 });
	});

	it('measures a tool by its name, description and JSON input schema', () => {
		const budget = measureContextBudget({
			systemPrompt: '',
			skillCatalog: '',
			tools: [
				tool({
					name: 'lookup',
					description: 'Look up a thing.',
					systemInstruction: 'Call lookup first.',
					inputSchema: z.object({ query: z.string().describe('What to look up') }),
				}),
			],
		});

		const [measured] = budget.tools;
		expect(measured.name).toBe('lookup');
		expect(measured.descriptionChars).toBe('Look up a thing.'.length);
		expect(measured.systemInstructionChars).toBe('Call lookup first.'.length);
		expect(measured.schemaChars).toBeGreaterThan('What to look up'.length);
		// The runtime sends the name as the tool key, so a rename changes the size.
		expect(measured.chars).toBe('lookup'.length + measured.descriptionChars + measured.schemaChars);
	});

	// System instructions go into the system message, not the tool definitions.
	it('counts tool system instructions as their own section', () => {
		const budget = measureContextBudget({
			systemPrompt: '',
			skillCatalog: '',
			tools: [tool({ name: 'lookup', systemInstruction: 'Call lookup first.' })],
		});

		expect(budget.sections.find((s) => s.name === 'tool system instructions')?.chars).toBe(
			'Call lookup first.'.length,
		);
		expect(budget.sections.find((s) => s.name === 'tools')?.chars).toBe('lookup'.length);
	});

	it('measures a raw JSON Schema input as it is serialized', () => {
		const inputSchema = {
			type: 'object' as const,
			properties: { id: { type: 'string' as const } },
		};

		const budget = measureContextBudget({
			systemPrompt: '',
			skillCatalog: '',
			tools: [tool({ name: 'mcp_tool', inputSchema })],
		});

		expect(budget.tools[0].schemaChars).toBe(JSON.stringify(inputSchema).length);
	});

	it('sorts tools from the largest to the smallest and sums them into the tools section', () => {
		const budget = measureContextBudget({
			systemPrompt: '',
			skillCatalog: '',
			tools: [tool({ name: 'a', description: 'x' }), tool({ name: 'b', description: 'xxxx' })],
		});

		expect(budget.tools.map((t) => t.name)).toEqual(['b', 'a']);
		expect(budget.sections.find((s) => s.name === 'tools')).toEqual({
			name: 'tools',
			chars: 7,
			tokens: 2,
		});
	});

	it('adds optional skills as their own section', () => {
		const budget = measureContextBudget({
			systemPrompt: '',
			skillCatalog: '',
			tools: [],
			skills: [
				{ id: 'workflow-builder', chars: 800 },
				{ id: 'planning', chars: 40 },
			],
		});

		expect(budget.sections.at(-1)).toEqual({ name: 'loaded skills', chars: 840, tokens: 210 });
	});
});

describe('formatContextBudget', () => {
	it('renders a markdown table with one row for each section, a total and each tool', () => {
		const budget = measureContextBudget({
			systemPrompt: 'a'.repeat(40),
			skillCatalog: '',
			tools: [tool({ name: 'lookup', description: 'd'.repeat(8) })],
		});

		const text = formatContextBudget(budget);

		expect(text).toContain('| system prompt | 40 | 10 |');
		expect(text).toContain('| **total** | 54 | 14 |');
		expect(text).toContain('| lookup | 8 | 0 | 0 | 14 |');
	});
});
