/* eslint-disable @typescript-eslint/no-implied-eval */
import { transform } from 'esbuild';
import * as agents from '@n8n/agents';
import { Agent } from '@n8n/agents';
import * as zod from 'zod';
import type { AgentSchema } from '@n8n/agents';

import { extractSources } from '../agent-framework-source-parser';
import { WorkflowTool } from '../types';
import { AgentSecureRuntime } from '../agent-secure-runtime';

// No mocking of isolated-vm — use the real V8 isolate for integration testing.

// ---------------------------------------------------------------------------
// Fixture: a real-world D&D agent with tools, memory, checkpoint, thinking
// ---------------------------------------------------------------------------

const DND_AGENT_SOURCE = `
import { Agent, Memory, Tool, WorkflowTool } from '@n8n/agents';
import { z } from 'zod';

export default new Agent('D&D Agent')
  .model('anthropic/claude-sonnet-4-5')
  .credential('Anthropic account')
  .instructions('You are a Dungeon Master for D&D 5th Edition. Be creative and fair!')
  .tool(
    new Tool('roll_dice')
      .description('Roll dice using D&D notation')
      .input(z.object({
        dice: z.string().describe('Dice notation'),
        reason: z.string().optional().describe('What the roll is for'),
      }))
      .output(z.object({
        result: z.number(),
        rolls: z.array(z.number()),
        formula: z.string(),
        breakdown: z.string(),
      }))
      .suspend(z.object({ dice: z.string(), reason: z.string().optional(), message: z.string() }))
      .resume(z.object({ approved: z.boolean() }))
      .handler(async (input, ctx) => {
        const { dice, reason } = input;
        if (!ctx.resumeData) {
          return await ctx.suspend({ dice, reason, message: 'Approve roll?' });
        }
        if (!ctx.resumeData.approved) throw new Error('Not approved');
        const rolls = [Math.floor(Math.random() * 20) + 1];
        return { result: rolls[0], rolls, formula: dice, breakdown: dice + ' = ' + rolls[0] };
      })
  )
  .tool(
    new Tool('generate_character')
      .description('Generate a D&D character')
      .input(z.object({ name: z.string().describe('Character name') }))
      .output(z.object({ name: z.string(), stats: z.record(z.number()) }))
      .handler(async ({ name }) => {
        return { name, stats: { STR: 14, DEX: 12, CON: 13 } };
      })
      .toMessage(async (output) => ({
        components: [{ type: 'section' as const, text: '**' + output.name + '**' }],
      }))
  )
  .tool(
    new Tool('current_date')
      .description('Get current date')
      .input(z.object({}))
      .output(z.object({ date: z.string() }))
      .handler(async () => ({ date: new Date().toISOString() }))
  )
  .tool(new WorkflowTool('Send D&D Calendar Invite'))
  .tool(new WorkflowTool('Get D&D Feedback'))
  .memory(new Memory().lastMessages(100))
  .checkpoint('memory')
  .thinking('anthropic', { budgetTokens: 1024 });
`;

// ---------------------------------------------------------------------------
// Helper: replicate the real compile flow
// ---------------------------------------------------------------------------

async function compileAndDescribe(source: string): Promise<AgentSchema> {
	const result = await transform(source, { loader: 'ts', format: 'cjs', target: 'es2022' });

	const moduleExports: Record<string, unknown> = {};
	const sandboxedAgents = { ...agents, WorkflowTool };
	const moduleRequire = (id: string) => {
		if (id === '@n8n/agents') return sandboxedAgents;
		if (id === 'zod') return zod;
		throw new Error('Unavailable: ' + id);
	};

	const fn = new Function(
		'exports',
		'require',
		'module',
		'fetch',
		'console',
		'Buffer',
		result.code,
	);
	const mod = { exports: moduleExports };
	fn(moduleExports, moduleRequire, mod, fetch, console, Buffer);

	const exported = mod.exports.default ?? mod.exports;
	const schema = (exported as { describe: () => AgentSchema }).describe();

	// Extract and patch source strings (same as agent-framework.service.ts)
	const extracted = extractSources(source);
	for (const tool of schema.tools) {
		const src = extracted.tools.get(tool.name);
		if (src) {
			tool.handlerSource = src.handlerSource ?? tool.handlerSource;
			tool.inputSchemaSource = src.inputSchemaSource;
			tool.outputSchemaSource = src.outputSchemaSource;
			tool.suspendSchemaSource = src.suspendSchemaSource;
			tool.resumeSchemaSource = src.resumeSchemaSource;
			tool.toMessageSource = src.toMessageSource;
			tool.needsApprovalFnSource = src.needsApprovalFnSource;
		}
	}
	if (schema.memory) schema.memory.source = extracted.memory;

	return schema;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('D&D Agent Round-Trip', () => {
	it('produces a complete schema from the agent source', async () => {
		const schema = await compileAndDescribe(DND_AGENT_SOURCE);

		// Model + credential
		expect(schema.model).toEqual({ provider: 'anthropic', name: 'claude-sonnet-4-5' });
		expect(schema.credential).toBe('Anthropic account');
		expect(schema.instructions).toContain('Dungeon Master');

		// 5 tools total: 3 custom + 2 workflow markers
		expect(schema.tools).toHaveLength(5);
		const custom = schema.tools.filter((t) => t.editable);
		const workflow = schema.tools.filter((t) => !t.editable && !t.handlerSource);
		expect(custom).toHaveLength(3);
		expect(workflow).toHaveLength(2);
		expect(workflow.map((t) => t.name).sort()).toEqual([
			'Get D&D Feedback',
			'Send D&D Calendar Invite',
		]);

		// roll_dice: suspend/resume + handler source extracted
		const rollDice = schema.tools.find((t) => t.name === 'roll_dice')!;
		expect(rollDice.hasSuspend).toBe(true);
		expect(rollDice.hasResume).toBe(true);
		expect(rollDice.handlerSource).toContain('ctx.resumeData');
		expect(rollDice.inputSchemaSource).toContain('z.object');
		expect(rollDice.suspendSchemaSource).toContain('z.object');

		// generate_character: toMessage source extracted
		const genChar = schema.tools.find((t) => t.name === 'generate_character')!;
		expect(genChar.hasToMessage).toBe(true);
		expect(genChar.toMessageSource).toContain('components');

		// Memory, checkpoint, thinking
		expect(schema.memory).not.toBeNull();
		expect(schema.memory!.lastMessages).toBe(100);
		expect(schema.memory!.source).toContain('lastMessages(100)');
		expect(schema.checkpoint).toBe('memory');
		expect(schema.config.thinking).toEqual({ provider: 'anthropic', budgetTokens: 1024 });
	});

	it('generates code containing all original constructs', async () => {
		const schema = await compileAndDescribe(DND_AGENT_SOURCE);
		const code = await agents.generateAgentCode(schema, 'D&D Agent');

		// Imports
		expect(code).toContain("from '@n8n/agents'");
		expect(code).toContain("from 'zod'");
		expect(code).toContain('Agent');
		expect(code).toContain('Tool');
		expect(code).toContain('Memory');
		expect(code).toContain('WorkflowTool');

		// Agent chain
		expect(code).toContain(".model('anthropic', 'claude-sonnet-4-5')");
		expect(code).toContain(".credential('Anthropic account')");
		expect(code).toContain('Dungeon Master');

		// Custom tools with handlers
		expect(code).toContain("new Tool('roll_dice')");
		expect(code).toContain("new Tool('generate_character')");
		expect(code).toContain("new Tool('current_date')");
		expect(code).toContain('.handler(');
		expect(code).toContain('.suspend(');
		expect(code).toContain('.resume(');
		expect(code).toContain('.toMessage(');

		// Workflow tools
		expect(code).toContain("new WorkflowTool('Send D&D Calendar Invite')");
		expect(code).toContain("new WorkflowTool('Get D&D Feedback')");

		// Memory, checkpoint, thinking
		expect(code).toContain('.memory(');
		expect(code).toContain(".checkpoint('memory')");
		expect(code).toContain('budgetTokens: 1024');
	});

	it('extracts tools passed as an inline array to .tool()', async () => {
		const source = `
import { Agent, Tool } from '@n8n/agents';
import { z } from 'zod';

export default new Agent('array-tool-agent')
  .model('anthropic/claude-sonnet-4-5')
  .credential('anthropic')
  .instructions('Test agent')
  .tool([
    new Tool('tool_a')
      .description('First tool')
      .input(z.object({ x: z.string() }))
      .handler(async ({ x }) => ({ result: x })),
    new Tool('tool_b')
      .description('Second tool')
      .input(z.object({ n: z.number() }))
      .handler(async ({ n }) => ({ doubled: n * 2 })),
  ]);
`;
		const schema = await compileAndDescribe(source);

		expect(schema.tools).toHaveLength(2);
		const toolA = schema.tools.find((t) => t.name === 'tool_a')!;
		const toolB = schema.tools.find((t) => t.name === 'tool_b')!;

		expect(toolA).toBeDefined();
		expect(toolA.handlerSource).toContain('result: x');
		expect(toolA.inputSchemaSource).toContain('z.object');

		expect(toolB).toBeDefined();
		expect(toolB.handlerSource).toContain('doubled');
		expect(toolB.inputSchemaSource).toContain('z.number');
	});

	it('extracts tools passed as a variable array to .tool()', async () => {
		const source = `
import { Agent, Tool } from '@n8n/agents';
import { z } from 'zod';

const utilityTools = [
  new Tool('fetch_data')
    .description('Fetch remote data')
    .input(z.object({ url: z.string() }))
    .handler(async ({ url }) => ({ data: url })),
  new Tool('parse_json')
    .description('Parse a JSON string')
    .input(z.object({ raw: z.string() }))
    .handler(async ({ raw }) => JSON.parse(raw)),
];

export default new Agent('variable-array-agent')
  .model('openai/gpt-4o')
  .credential('openai')
  .instructions('Test agent')
  .tool(utilityTools);
`;
		const schema = await compileAndDescribe(source);

		expect(schema.tools).toHaveLength(2);
		const fetchData = schema.tools.find((t) => t.name === 'fetch_data')!;
		const parseJson = schema.tools.find((t) => t.name === 'parse_json')!;

		expect(fetchData).toBeDefined();
		expect(fetchData.handlerSource).toContain('data: url');
		expect(fetchData.inputSchemaSource).toContain('z.string');

		expect(parseJson).toBeDefined();
		expect(parseJson.handlerSource).toContain('JSON.parse');
	});

	it('extracts tools from a mixed array with inline and variable elements', async () => {
		const source = `
import { Agent, Tool } from '@n8n/agents';
import { z } from 'zod';

const inlineTool = new Tool('from_var')
  .description('Defined as a variable')
  .input(z.object({ val: z.boolean() }))
  .handler(async ({ val }) => ({ toggled: !val }));

export default new Agent('mixed-array-agent')
  .model('anthropic/claude-sonnet-4-5')
  .credential('anthropic')
  .instructions('Test agent')
  .tool([
    inlineTool,
    new Tool('inline_tool')
      .description('Defined inline in the array')
      .input(z.object({ msg: z.string() }))
      .handler(async ({ msg }) => ({ echo: msg })),
  ]);
`;
		const schema = await compileAndDescribe(source);

		expect(schema.tools).toHaveLength(2);
		const fromVar = schema.tools.find((t) => t.name === 'from_var')!;
		const inlineTool = schema.tools.find((t) => t.name === 'inline_tool')!;

		expect(fromVar).toBeDefined();
		expect(fromVar.handlerSource).toContain('toggled: !val');

		expect(inlineTool).toBeDefined();
		expect(inlineTool.handlerSource).toContain('echo: msg');
	});

	it('survives a full round-trip (source → schema → generate → recompile)', async () => {
		const schema1 = await compileAndDescribe(DND_AGENT_SOURCE);

		// Strip workflow tool markers for recompilation — they need the real CLI
		// resolver which isn't available in a test sandbox
		const schemaForGen = JSON.parse(JSON.stringify(schema1)) as AgentSchema;
		schemaForGen.tools = schemaForGen.tools.filter((t) => t.editable || t.handlerSource);

		const generated = await agents.generateAgentCode(schemaForGen, 'D&D Agent');
		const schema2 = await compileAndDescribe(generated);

		// Scalar fields survive
		expect(schema2.model).toEqual(schema1.model);
		expect(schema2.credential).toEqual(schema1.credential);
		expect(schema2.instructions).toEqual(schema1.instructions);
		expect(schema2.checkpoint).toEqual(schema1.checkpoint);
		expect(schema2.config.thinking).toEqual(schema1.config.thinking);
		expect(schema2.memory?.lastMessages).toEqual(schema1.memory?.lastMessages);

		// Custom tools survive with all capabilities intact
		const custom1 = schema1.tools.filter((t) => t.editable || t.handlerSource);
		expect(schema2.tools).toHaveLength(custom1.length);

		for (const t1 of custom1) {
			const t2 = schema2.tools.find((t) => t.name === t1.name);
			expect(t2).toBeDefined();
			expect(t2!.handlerSource).toBeTruthy();
			expect(t2!.hasSuspend).toBe(t1.hasSuspend);
			expect(t2!.hasResume).toBe(t1.hasResume);
			expect(t2!.hasToMessage).toBe(t1.hasToMessage);
		}
	});
});

// ---------------------------------------------------------------------------
// Sandboxed execution round-trip
// ---------------------------------------------------------------------------

describe('Sandboxed execution round-trip', () => {
	let runtime: AgentSecureRuntime;

	beforeAll(() => {
		runtime = new AgentSecureRuntime();
	});

	afterAll(() => {
		runtime.dispose();
	});

	it('code → describeSecurely → fromSchema → describe matches', async () => {
		const schema = await runtime.describeSecurely(DND_AGENT_SOURCE);

		// Verify schema was extracted correctly
		expect(schema.model.provider).toBe('anthropic');
		expect(schema.tools.length).toBeGreaterThan(0);

		// Reconstruct from schema
		const executor = runtime.createExecutor(DND_AGENT_SOURCE);
		const agent = await Agent.fromSchema(schema, 'D&D Agent', {
			handlerExecutor: executor,
		});

		// Describe the reconstructed agent
		const redescribed = agent.describe();
		expect(redescribed.model).toEqual(schema.model);
		expect(redescribed.credential).toEqual(schema.credential);
		expect(redescribed.instructions).toEqual(schema.instructions);
		// Compare tool names — fromSchema adds all tools (custom + WorkflowTool markers)
		expect(redescribed.tools.map((t) => t.name).sort()).toEqual(
			schema.tools.map((t) => t.name).sort(),
		);
	});
});
