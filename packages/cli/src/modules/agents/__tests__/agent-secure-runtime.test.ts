import { AgentSecureRuntime } from '../agent-secure-runtime';

// No mocking — uses the real isolated-vm V8 isolate.

const SIMPLE_AGENT_CODE = `
import { Agent, Tool } from '@n8n/agents';
import { z } from 'zod';

const helper = (x: number) => x * 2;

export default new Agent('test-agent')
  .model('anthropic', 'claude-sonnet-4-5')
  .credential('test-cred')
  .instructions('Be helpful')
  .tool(
    new Tool('double')
      .description('Doubles a number')
      .input(z.object({ value: z.number() }))
      .handler(async (input) => ({ result: helper(input.value) }))
  );
`;

describe('AgentSecureRuntime', () => {
	let runtime: AgentSecureRuntime;

	beforeEach(() => {
		runtime = new AgentSecureRuntime();
	});

	afterEach(() => {
		runtime.dispose();
	});

	it('describeSecurely returns AgentSchema from valid agent code', async () => {
		const schema = await runtime.describeSecurely(SIMPLE_AGENT_CODE);

		expect(schema).toBeDefined();
		expect(schema.model.name).toBe('claude-sonnet-4-5');
		expect(schema.credential).toBe('test-cred');
		expect(schema.instructions).toBe('Be helpful');
		expect(schema.tools).toHaveLength(1);
		expect(schema.tools[0].name).toBe('double');
		expect(schema.tools[0].description).toBe('Doubles a number');
		expect(schema.tools[0].handlerSource).toBeTruthy();
		expect(schema.tools[0].inputSchemaSource).toBeTruthy();
	});

	it('describeSecurely throws on invalid code', async () => {
		const badCode = 'this is not valid typescript @@@ {{{';
		await expect(runtime.describeSecurely(badCode)).rejects.toThrow();
	});

	it('describeSecurely throws when no agent is exported', async () => {
		const noAgent = 'export const foo = 42;';
		await expect(runtime.describeSecurely(noAgent)).rejects.toThrow(/No agent found/);
	});

	it('executeInModule executes a tool handler preserving closures', async () => {
		const result = await runtime.executeInModule(SIMPLE_AGENT_CODE, 'tool', 'double', {
			input: { value: 21 },
		});
		expect(result).toEqual({ result: 42 });
	});

	it('executeInModule returns suspend marker when tool calls ctx.suspend()', async () => {
		const SUSPEND_AGENT_CODE = `
import { Agent, Tool } from '@n8n/agents';
import { z } from 'zod';

export default new Agent('suspend-agent')
  .model('anthropic', 'claude-sonnet-4-5')
  .credential('test-cred')
  .instructions('Be helpful')
  .tool(
    new Tool('approve')
      .description('Needs approval')
      .input(z.object({ action: z.string() }))
      .suspend(z.object({ message: z.string() }))
      .resume(z.object({ approved: z.boolean() }))
      .handler(async (input, ctx) => {
        if (!ctx.resumeData) {
          return await ctx.suspend({ message: 'Approve ' + input.action + '?' });
        }
        return { approved: ctx.resumeData.approved };
      })
  );
`;
		const result = await runtime.executeInModule(SUSPEND_AGENT_CODE, 'tool', 'approve', {
			input: { action: 'deploy' },
			ctx: {},
		});

		// Should return the suspend marker
		const suspendMarker = Symbol.for('n8n.agent.suspend');
		expect(result).toBeDefined();
		expect((result as Record<symbol, unknown>)[suspendMarker]).toBe(true);
		expect((result as Record<string, unknown>).payload).toEqual({
			message: 'Approve deploy?',
		});
	});

	it('evaluateZodSource converts a Zod schema to JSON Schema', async () => {
		const jsonSchema = await runtime.evaluateZodSource(
			'z.object({ name: z.string(), age: z.number() })',
		);

		expect(jsonSchema).toBeDefined();
		expect(jsonSchema.type).toBe('object');
		expect(jsonSchema.properties).toBeDefined();
		const props = jsonSchema.properties as Record<string, Record<string, unknown>>;
		expect(props.name).toBeDefined();
		expect(props.name.type).toBe('string');
		expect(props.age).toBeDefined();
		expect(props.age.type).toBe('number');
	});

	it('evaluateZodSource handles nested schemas', async () => {
		const jsonSchema = await runtime.evaluateZodSource(
			'z.object({ address: z.object({ street: z.string(), zip: z.string() }) })',
		);

		expect(jsonSchema.type).toBe('object');
		const props = jsonSchema.properties as Record<string, Record<string, unknown>>;
		expect(props.address).toBeDefined();
		expect(props.address.type).toBe('object');
	});
});

describe('AgentSecureRuntime — does not throw "Not supported"', () => {
	let rt: AgentSecureRuntime;

	beforeAll(() => {
		// Fresh instance so libraryBundle is rebuilt from scratch, not shared with
		// the suite above (which may have already cached a good bundle).
		rt = new AgentSecureRuntime();
	});

	afterAll(() => {
		rt.dispose();
	});

	it('describeSecurely succeeds — fails with "Not supported" if @modelcontextprotocol/* is removed from esbuild externals', async () => {
		const schema = await rt.describeSecurely(SIMPLE_AGENT_CODE);

		// Basic shape check — the actual regression manifests as a thrown error,
		// not a wrong schema value, so any successful return proves the fix works.
		expect(schema.model.name).toBe('claude-sonnet-4-5');
		expect(schema.tools).toHaveLength(1);
		expect(schema.tools[0].name).toBe('double');
	});
});
