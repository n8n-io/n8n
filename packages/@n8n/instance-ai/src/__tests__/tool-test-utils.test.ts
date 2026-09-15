import type { BuiltTool } from '@n8n/agents';
import { z } from 'zod';

import { parseToolInput } from './tool-test-utils';

function builtToolWith(inputSchema: BuiltTool['inputSchema']): BuiltTool {
	return { name: 'demo', description: 'demo', inputSchema } as BuiltTool;
}

describe('parseToolInput', () => {
	it('validates input against a Zod input schema', () => {
		const tool = builtToolWith(z.object({ title: z.string().min(1) }));

		expect(parseToolInput(tool, { title: 'Build a workflow' }).success).toBe(true);
		expect(parseToolInput(tool, { title: '' }).success).toBe(false);
	});

	it('reports a usable error for a tool carrying a raw JSON Schema', () => {
		// MCP tools carry a JSON Schema, which has no `safeParse`.
		const tool = builtToolWith({ type: 'object', properties: { title: { type: 'string' } } });

		expect(() => parseToolInput(tool, { title: 'x' })).toThrow(
			'Tool "demo" has no Zod input schema',
		);
	});

	it('reports a usable error for a tool with no input schema', () => {
		expect(() => parseToolInput(builtToolWith(undefined), {})).toThrow(
			'Tool "demo" has no Zod input schema',
		);
	});
});
