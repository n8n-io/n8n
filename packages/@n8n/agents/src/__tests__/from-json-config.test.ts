import { z } from 'zod';

import { Tool } from '../sdk/tool';
import type { AgentMessage } from '../types/sdk/message';
import type { InterruptibleToolContext } from '../types/sdk/tool';

// ---------------------------------------------------------------------------
// Tool.describe() tests
// ---------------------------------------------------------------------------

describe('Tool.describe()', () => {
	it('returns a ToolDescriptor with name, description, and inputSchema', () => {
		const tool = new Tool('search')
			.description('Search the web')
			.input(z.object({ query: z.string() }))
			.handler(async ({ query }) => await Promise.resolve({ result: query }));

		const descriptor = tool.describe();

		expect(descriptor.name).toBe('search');
		expect(descriptor.description).toBe('Search the web');
		expect(descriptor.inputSchema).toBeDefined();
		expect(descriptor.outputSchema).toBeNull();
		expect(descriptor.hasSuspend).toBe(false);
		expect(descriptor.hasResume).toBe(false);
		expect(descriptor.hasToMessage).toBe(false);
		expect(descriptor.requireApproval).toBe(false);
		expect(descriptor.providerOptions).toBeNull();
		expect(descriptor.systemInstruction).toBeNull();
	});

	it('persists systemInstruction through describe() so it survives JSON-config round-trip', () => {
		const directive = 'Always cite a URL when summarising web search results.';
		const tool = new Tool('search')
			.description('Search the web')
			.systemInstruction(directive)
			.input(z.object({ query: z.string() }))
			.handler(async ({ query }) => await Promise.resolve({ result: query }));

		const descriptor = tool.describe();

		expect(descriptor.systemInstruction).toBe(directive);
	});

	it('sets hasSuspend/hasResume when suspend/resume are defined', () => {
		const tool = new Tool('approve')
			.description('Approve an action')
			.input(z.object({ action: z.string() }))
			.suspend(z.object({ message: z.string() }))
			.resume(z.object({ approved: z.boolean() }))
			.handler(async (input, ctx) => {
				const interruptCtx = ctx as InterruptibleToolContext;
				if (!interruptCtx.resumeData) {
					return await interruptCtx.suspend({ message: `Approve: ${input.action}?` });
				}
				return {
					result: (interruptCtx.resumeData as { approved: boolean }).approved
						? 'approved'
						: 'denied',
				};
			});

		const descriptor = tool.describe();

		expect(descriptor.hasSuspend).toBe(true);
		expect(descriptor.hasResume).toBe(true);
	});

	it('sets hasToMessage when toMessage is defined', () => {
		const tool = new Tool('get_data')
			.description('Get data')
			.input(z.object({ id: z.string() }))
			.output(z.object({ value: z.string() }))
			.toMessage(
				(output) =>
					({
						type: 'custom',
						data: {
							components: [{ type: 'section', text: output.value }],
						},
					}) as unknown as AgentMessage,
			)
			.handler(async ({ id }) => await Promise.resolve({ value: id }));

		const descriptor = tool.describe();

		expect(descriptor.hasToMessage).toBe(true);
	});

	it('sets requireApproval when .requireApproval() is called', () => {
		const tool = new Tool('delete')
			.description('Delete a record')
			.input(z.object({ id: z.string() }))
			.requireApproval()
			.handler(async ({ id }) => await Promise.resolve({ deleted: id }));

		const descriptor = tool.describe();

		expect(descriptor.requireApproval).toBe(true);
	});

	it('sets outputSchema when output schema is defined', () => {
		const tool = new Tool('compute')
			.description('Compute something')
			.input(z.object({ value: z.number() }))
			.output(z.object({ result: z.number() }))
			.handler(async ({ value }) => await Promise.resolve({ result: value * 2 }));

		const descriptor = tool.describe();

		expect(descriptor.outputSchema).toBeDefined();
		expect(descriptor.outputSchema).not.toBeNull();
	});

	it('throws if name is missing', () => {
		const tool = new Tool('');
		expect(() => tool.describe()).toThrow('Tool name is required');
	});

	it('throws if description is missing', () => {
		const tool = new Tool('no-desc')
			.input(z.object({ x: z.string() }))
			.handler(async ({ x }) => await Promise.resolve({ x }));
		expect(() => tool.describe()).toThrow('"no-desc" requires a description');
	});

	it('throws if input schema is missing', () => {
		const tool = new Tool('no-input').description('No input');
		expect(() => tool.describe()).toThrow('"no-input" requires an input schema');
	});

	it('inputSchema conforms to JSON Schema format', () => {
		const tool = new Tool('typed')
			.description('Typed tool')
			.input(
				z.object({
					name: z.string().describe('The name'),
					count: z.number().int().min(1),
				}),
			)
			.handler(async ({ name, count }) => await Promise.resolve({ name, count }));

		const descriptor = tool.describe();

		expect(descriptor.inputSchema).toBeDefined();
		const schema = descriptor.inputSchema as Record<string, unknown>;
		expect(schema.type).toBe('object');
		expect(schema.properties).toBeDefined();
	});
});
