import { z } from 'zod';

import { Agent } from '../sdk/agent';
import { McpClient } from '../sdk/mcp-client';
import { Telemetry } from '../sdk/telemetry';
import { Tool } from '../sdk/tool';
import type { BuiltEval, BuiltGuardrail, BuiltMemory, BuiltProviderTool } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockMemory(): BuiltMemory {
	return {
		getThread: jest.fn(),
		saveThread: jest.fn(),
		deleteThread: jest.fn(),
		getMessages: jest.fn(),
		saveMessages: jest.fn(),
		deleteMessages: jest.fn(),
	} as unknown as BuiltMemory;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Agent.describe()', () => {
	it('returns null/empty fields for an unconfigured agent', () => {
		const agent = new Agent('test-agent');
		const schema = agent.describe();

		expect(schema.model).toEqual({ provider: null, name: null });
		expect(schema.credential).toBeNull();
		expect(schema.instructions).toBeNull();
		expect(schema.description).toBeNull();
		expect(schema.tools).toEqual([]);
		expect(schema.providerTools).toEqual([]);
		expect(schema.memory).toBeNull();
		expect(schema.evaluations).toEqual([]);
		expect(schema.guardrails).toEqual([]);
		expect(schema.mcp).toBeNull();
		expect(schema.telemetry).toBeNull();
		expect(schema.checkpoint).toBeNull();
		expect(schema.config.structuredOutput).toEqual({ enabled: false, schemaSource: null });
		expect(schema.config.thinking).toBeNull();
		expect(schema.config.toolCallConcurrency).toBeNull();
		expect(schema.config.requireToolApproval).toBe(false);
	});

	// --- Model parsing ---

	it('parses two-arg model (provider, name)', () => {
		const agent = new Agent('test-agent').model('anthropic', 'claude-sonnet-4-5');
		const schema = agent.describe();

		expect(schema.model).toEqual({ provider: 'anthropic', name: 'claude-sonnet-4-5' });
	});

	it('parses single-arg model with slash', () => {
		const agent = new Agent('test-agent').model('anthropic/claude-sonnet-4-5');
		const schema = agent.describe();

		expect(schema.model).toEqual({ provider: 'anthropic', name: 'claude-sonnet-4-5' });
	});

	it('parses model without slash', () => {
		const agent = new Agent('test-agent').model('gpt-4o');
		const schema = agent.describe();

		expect(schema.model).toEqual({ provider: null, name: 'gpt-4o' });
	});

	it('handles object model config', () => {
		const agent = new Agent('test-agent').model({
			id: 'anthropic/claude-sonnet-4-5',
			apiKey: 'sk-test',
		});
		const schema = agent.describe();

		expect(schema.model).toEqual({ provider: null, name: null, raw: 'object' });
	});

	// --- Credential ---

	it('returns credential name', () => {
		const agent = new Agent('test-agent').credential('my-anthropic-key');
		const schema = agent.describe();

		expect(schema.credential).toBe('my-anthropic-key');
	});

	// --- Instructions ---

	it('returns instructions text', () => {
		const agent = new Agent('test-agent').instructions('You are helpful.');
		const schema = agent.describe();

		expect(schema.instructions).toBe('You are helpful.');
	});

	// --- Custom tool ---

	it('describes a custom tool with handler, input schema, and suspend/resume', () => {
		const suspendSchema = z.object({ reason: z.string() });
		const resumeSchema = z.object({ approved: z.boolean() });

		const tool = new Tool('danger')
			.description('A dangerous action')
			.input(z.object({ target: z.string() }))
			.output(z.object({ result: z.string() }))
			.suspend(suspendSchema)
			.resume(resumeSchema)
			.handler(async ({ target }) => await Promise.resolve({ result: target }))
			.build();

		const agent = new Agent('test-agent').tool(tool);
		const schema = agent.describe();

		expect(schema.tools).toHaveLength(1);
		const ts = schema.tools[0];
		expect(ts.name).toBe('danger');
		expect(ts.editable).toBe(true);
		expect(ts.hasSuspend).toBe(true);
		expect(ts.hasResume).toBe(true);
		expect(ts.hasToMessage).toBe(false);
		expect(ts.inputSchema).toBeTruthy();
		expect(ts.outputSchema).toBeTruthy();
		// handlerSource is a fallback (compiled JS), CLI overrides with real TypeScript
		expect(ts.handlerSource).toContain('target');
		// Source string fields are null — CLI patches with original TypeScript
		expect(ts.inputSchemaSource).toBeNull();
		expect(ts.outputSchemaSource).toBeNull();
		expect(ts.suspendSchemaSource).toBeNull();
		expect(ts.resumeSchemaSource).toBeNull();
		expect(ts.toMessageSource).toBeNull();
		expect(ts.requireApproval).toBe(false);
		expect(ts.needsApprovalFnSource).toBeNull();
		expect(ts.providerOptions).toBeNull();
	});

	// --- Provider tool ---

	it('describes a provider tool in providerTools array', () => {
		const providerTool: BuiltProviderTool = {
			name: 'anthropic.web_search_20250305',
			args: { maxResults: 5 },
		};

		const agent = new Agent('test-agent').providerTool(providerTool);
		const schema = agent.describe();

		// Provider tools are now in a separate array
		expect(schema.tools).toHaveLength(0);
		expect(schema.providerTools).toHaveLength(1);
		expect(schema.providerTools[0].name).toBe('anthropic.web_search_20250305');
		expect(schema.providerTools[0].source).toBe('');
	});

	// --- MCP servers ---

	it('describes MCP servers in mcp field', () => {
		const client = new McpClient([
			{ name: 'browser', url: 'http://localhost:9222/mcp', transport: 'streamableHttp' },
			{ name: 'fs', command: 'echo', args: ['test'] },
		]);

		const agent = new Agent('test-agent').mcp(client);
		const schema = agent.describe();

		// MCP servers are now in a separate mcp field
		expect(schema.tools).toHaveLength(0);
		expect(schema.mcp).toHaveLength(2);
		expect(schema.mcp![0].name).toBe('browser');
		expect(schema.mcp![0].configSource).toBe('');
		expect(schema.mcp![1].name).toBe('fs');
		expect(schema.mcp![1].configSource).toBe('');
	});

	it('returns null mcp when no clients are configured', () => {
		const agent = new Agent('test-agent');
		const schema = agent.describe();

		expect(schema.mcp).toBeNull();
	});

	// --- Guardrails ---

	it('describes input and output guardrails', () => {
		const inputGuard: BuiltGuardrail = {
			name: 'pii-filter',
			guardType: 'pii',
			strategy: 'redact',
			_config: { types: ['email', 'phone'] },
		};
		const outputGuard: BuiltGuardrail = {
			name: 'moderation-check',
			guardType: 'moderation',
			strategy: 'block',
			_config: {},
		};

		const agent = new Agent('test-agent').inputGuardrail(inputGuard).outputGuardrail(outputGuard);
		const schema = agent.describe();

		expect(schema.guardrails).toHaveLength(2);
		expect(schema.guardrails[0]).toEqual({
			name: 'pii-filter',
			guardType: 'pii',
			strategy: 'redact',
			position: 'input',
			config: { types: ['email', 'phone'] },
			source: '',
		});
		expect(schema.guardrails[1]).toEqual({
			name: 'moderation-check',
			guardType: 'moderation',
			strategy: 'block',
			position: 'output',
			config: {},
			source: '',
		});
	});

	// --- Telemetry ---

	it('returns telemetry schema when telemetry builder is set', () => {
		const agent = new Agent('test-agent').telemetry(new Telemetry());
		const schema = agent.describe();

		expect(schema.telemetry).toEqual({ source: '' });
	});

	it('returns null telemetry when not configured', () => {
		const agent = new Agent('test-agent');
		const schema = agent.describe();

		expect(schema.telemetry).toBeNull();
	});

	// --- Checkpoint ---

	it('returns memory checkpoint when checkpoint is memory', () => {
		const agent = new Agent('test-agent').checkpoint('memory');
		const schema = agent.describe();

		expect(schema.checkpoint).toBe('memory');
	});

	it('returns null checkpoint when not configured', () => {
		const agent = new Agent('test-agent');
		const schema = agent.describe();

		expect(schema.checkpoint).toBeNull();
	});

	// --- Memory ---

	it('describes memory configuration', () => {
		const agent = new Agent('test-agent').memory({
			memory: makeMockMemory(),
			lastMessages: 20,
			semanticRecall: {
				topK: 5,
				messageRange: { before: 2, after: 2 },
				embedder: 'openai/text-embedding-3-small',
			},
			workingMemory: {
				template: 'Current state: {{state}}',
				structured: false,
				scope: 'resource' as const,
			},
		});
		const schema = agent.describe();

		expect(schema.memory).toBeTruthy();
		expect(schema.memory!.source).toBeNull();
		expect(schema.memory!.lastMessages).toBe(20);
		expect(schema.memory!.semanticRecall).toEqual({
			topK: 5,
			messageRange: { before: 2, after: 2 },
			embedder: 'openai/text-embedding-3-small',
		});
		expect(schema.memory!.workingMemory).toEqual({
			type: 'freeform',
			template: 'Current state: {{state}}',
		});
	});

	it('describes structured working memory', () => {
		const agent = new Agent('test-agent').memory({
			memory: makeMockMemory(),
			lastMessages: 10,
			workingMemory: {
				template: '',
				structured: true,
				schema: z.object({ notes: z.string() }),
				scope: 'resource' as const,
			},
		});
		const schema = agent.describe();

		expect(schema.memory!.workingMemory!.type).toBe('structured');
		expect(schema.memory!.workingMemory!.schema).toBeTruthy();
	});

	// --- Evaluations ---

	it('describes evaluations with evalType, modelId, and handlerSource', () => {
		const checkEval: BuiltEval = {
			name: 'has-greeting',
			description: 'Checks for greeting',
			evalType: 'check',
			modelId: null,
			credentialName: null,
			_run: jest.fn(),
		};
		const judgeEval: BuiltEval = {
			name: 'quality-judge',
			description: undefined,
			evalType: 'judge',
			modelId: 'anthropic/claude-haiku-4-5',
			credentialName: 'anthropic-key',
			_run: jest.fn(),
		};

		const agent = new Agent('test-agent').eval(checkEval).eval(judgeEval);
		const schema = agent.describe();

		expect(schema.evaluations).toHaveLength(2);
		expect(schema.evaluations[0]).toEqual({
			name: 'has-greeting',
			description: 'Checks for greeting',
			type: 'check',
			modelId: null,
			hasCredential: false,
			credentialName: null,
			handlerSource: null,
		});
		expect(schema.evaluations[1]).toEqual({
			name: 'quality-judge',
			description: null,
			type: 'judge',
			modelId: 'anthropic/claude-haiku-4-5',
			hasCredential: true,
			credentialName: 'anthropic-key',
			handlerSource: null,
		});
	});

	// --- Thinking config ---

	it('describes anthropic thinking config', () => {
		const agent = new Agent('test-agent')
			.model('anthropic', 'claude-sonnet-4-5')
			.thinking('anthropic', { budgetTokens: 10000 });
		const schema = agent.describe();

		expect(schema.config.thinking).toEqual({
			provider: 'anthropic',
			budgetTokens: 10000,
		});
	});

	it('describes openai thinking config', () => {
		const agent = new Agent('test-agent')
			.model('openai', 'o3-mini')
			.thinking('openai', { reasoningEffort: 'high' });
		const schema = agent.describe();

		expect(schema.config.thinking).toEqual({
			provider: 'openai',
			reasoningEffort: 'high',
		});
	});

	// --- requireToolApproval ---

	it('reflects requireToolApproval flag', () => {
		const agent = new Agent('test-agent').requireToolApproval();
		const schema = agent.describe();

		expect(schema.config.requireToolApproval).toBe(true);
	});

	// --- toolCallConcurrency ---

	it('reflects toolCallConcurrency', () => {
		const agent = new Agent('test-agent').toolCallConcurrency(5);
		const schema = agent.describe();

		expect(schema.config.toolCallConcurrency).toBe(5);
	});

	// --- Structured output ---

	it('describes structured output with schemaSource null', () => {
		const outputSchema = z.object({ code: z.string(), explanation: z.string() });
		const agent = new Agent('test-agent').structuredOutput(outputSchema);
		const schema = agent.describe();

		expect(schema.config.structuredOutput.enabled).toBe(true);
		expect(schema.config.structuredOutput.schemaSource).toBeNull();
	});
});
