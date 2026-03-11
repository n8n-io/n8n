/* eslint-disable @typescript-eslint/require-await */
import { z } from 'zod';

import { Tool } from '../tool';

describe('Tool', () => {
	const inputSchema = z.object({ query: z.string() });
	const outputSchema = z.object({ result: z.string() });

	type Input = z.infer<typeof inputSchema>;

	const handler = jest.fn(async ({ query }: Input) => ({ result: `found: ${query}` }));

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

	describe('suspend/resume', () => {
		const suspendSchema = z.object({ reason: z.string() });
		const resumeSchema = z.object({ approved: z.boolean() });

		it('should build a tool with suspend and resume schemas', () => {
			const tool = new Tool('interruptible')
				.description('A tool that can be interrupted')
				.input(inputSchema)
				.output(outputSchema)
				.suspend(suspendSchema)
				.resume(resumeSchema)
				.handler(async ({ query }, ctx) => {
					if (!ctx.resumeData) {
						return await ctx.suspend({ reason: 'needs approval' });
					}
					return { result: `found: ${query}` };
				})
				.build();

			expect(tool.name).toBe('interruptible');
			expect(tool._suspendSchema).toBe(suspendSchema);
			expect(tool._resumeSchema).toBe(resumeSchema);
		});

		it('should have undefined schemas when suspend/resume are not used', () => {
			const tool = new Tool('simple')
				.description('A simple tool')
				.input(inputSchema)
				.output(outputSchema)
				.handler(handler)
				.build();

			expect(tool._suspendSchema).toBeUndefined();
			expect(tool._resumeSchema).toBeUndefined();
		});

		it('should throw if suspend is declared without resume', () => {
			expect(() =>
				new Tool('broken')
					.description('Missing resume')
					.input(inputSchema)
					.suspend(suspendSchema)
					.handler(async ({ query }) => ({ result: query }))
					.build(),
			).toThrow('Tool "broken" has .suspend() but missing .resume()');
		});

		it('should throw if resume is declared without suspend', () => {
			expect(() =>
				new Tool('broken')
					.description('Missing suspend')
					.input(inputSchema)
					.resume(resumeSchema)
					.handler(async ({ query }) => ({ result: query }))
					.build(),
			).toThrow('Tool "broken" has .resume() but missing .suspend()');
		});
	});
});
