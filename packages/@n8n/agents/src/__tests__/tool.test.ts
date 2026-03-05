/* eslint-disable @typescript-eslint/require-await */
import { z } from 'zod';

import { Tool } from '../tool';
import type { ToolContext } from '../types';

describe('Tool', () => {
	const inputSchema = z.object({ query: z.string() });
	const outputSchema = z.object({ result: z.string() });

	type Input = z.infer<typeof inputSchema>;
	type Output = z.infer<typeof outputSchema>;

	const handler: (input: Input, ctx: ToolContext) => Promise<Output> = jest.fn(
		async ({ query }: Input) => ({ result: `found: ${query}` }),
	);

	afterEach(() => jest.clearAllMocks());

	it('should build a tool with all fields', () => {
		const tool = new Tool('search')
			.description('Search the web')
			.input(inputSchema)
			.output(outputSchema)
			.handler(handler)
			.build();

		expect(tool.name).toBe('search');
		expect(tool.description).toBe('Search the web');
	});

	it('should throw if name is missing', () => {
		expect(() =>
			new Tool('').description('test').input(inputSchema).handler(handler).build(),
		).toThrow('Tool name is required');
	});

	it('should throw if description is missing', () => {
		expect(() => new Tool('test').input(inputSchema).handler(handler).build()).toThrow(
			'Tool "test" requires a description',
		);
	});

	it('should throw if input schema is missing', () => {
		// Handler never runs — the builder throws before reaching it.
		// Without .input() the generic defaults to ZodObject<ZodRawShape>,
		// so we provide a handler matching that loose signature.
		const looseHandler = jest.fn(async (_input: Record<string, unknown>) => ({}));
		expect(() => new Tool('test').description('test').handler(looseHandler).build()).toThrow(
			'Tool "test" requires an input schema',
		);
	});

	it('should throw if handler is missing', () => {
		expect(() => new Tool('test').description('test').input(inputSchema).build()).toThrow(
			'Tool "test" requires a handler',
		);
	});

	it('should build without output schema', () => {
		const tool = new Tool('test').description('test').input(inputSchema).handler(handler).build();

		expect(tool.name).toBe('test');
	});

	it('should support requiresApproval as boolean', () => {
		const tool = new Tool('dangerous')
			.description('Dangerous action')
			.input(inputSchema)
			.requiresApproval()
			.handler(handler)
			.build();

		expect(tool._approval).toBe(true);
	});

	it('should support requiresApproval as predicate', () => {
		const predicate = ({ query }: Input) => query.includes('delete');
		const tool = new Tool('conditional')
			.description('Conditionally dangerous')
			.input(inputSchema)
			.requiresApproval(predicate)
			.handler(handler)
			.build();

		expect(typeof tool._approval).toBe('function');
	});
});
