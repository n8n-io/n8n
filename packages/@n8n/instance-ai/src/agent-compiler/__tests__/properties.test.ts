import type { AgentJsonConfig } from '@n8n/api-types';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { NodeRegistry } from '../../workflow-compiler/catalog/node-registry';
import type { AgentCapabilityCatalog } from '../catalog/capabilities';
import { compileAgent } from '../compiler/compile';
import { renderInstructions } from '../compiler/instructions';
import { agentIrSchema, type AgentIR } from '../ir/schema';
import { applyAgentPatches, detectEditKind, type AgentPatch } from '../modes/edit';
import { detectChannels, extractAgentRequirements } from '../requirements/extract';
import { enumerateAgentScenarios, scenarioCoverage } from '../scenarios/enumerate';
import { validateCompiledAgent } from '../validation/validate';

/** Property-based checks (fast-check) for the agent compiler invariants. */

const registry = new NodeRegistry();
const catalog: AgentCapabilityCatalog = {
	channels: [{ type: 'slack', label: 'Slack', icon: 'slack', credentialTypes: ['slackApi'] }],
	workflows: [{ id: 'wf-1', name: 'Issue refund', published: true }],
	agents: [{ agentId: 'ag-1', name: 'Billing', published: true }],
	nodeRegistry: registry,
	defaultModel: { model: 'anthropic/claude-sonnet-4-5', credential: 'cred' },
	limitations: [],
};

const text = fc.string({ minLength: 1, maxLength: 24 }).filter((s) => s.trim().length > 0);
const ident = fc.stringMatching(/^[a-z][a-z0-9]{0,6}$/);
const tool = fc.oneof(
	fc.record({
		id: ident,
		kind: fc.constant('workflow' as const),
		name: text,
		workflowName: fc.constant('Issue refund'),
		requireApproval: fc.boolean(),
	}),
	fc.record({ id: ident, kind: fc.constant('custom' as const), name: text }),
	fc.record({
		id: ident,
		kind: fc.constant('node' as const),
		name: text,
		operationId: fc.constantFrom('slack.message.post', 'http.request'),
		params: fc.constant({ channel: '#ops', text: 'hi', url: 'https://example.com' }),
		useWhen: fc.option(text, { nil: undefined }),
	}),
);

const agentIr: fc.Arbitrary<AgentIR> = fc
	.record({
		ref: fc.constant('agent-1'),
		name: text,
		purpose: text,
		instructions: fc.record({ role: text, rules: fc.array(text, { maxLength: 3 }) }),
		channels: fc.array(
			fc.record({
				type: fc.constant('slack' as const),
				credentialId: fc.option(ident, { nil: undefined }),
			}),
			{ maxLength: 1 },
		),
		tools: fc.uniqueArray(tool, { maxLength: 5, selector: (t) => t.id }),
		tasks: fc.array(
			fc.record({ id: ident, name: text, objective: text, cron: fc.constant('0 9 * * *') }),
			{ maxLength: 2 },
		),
		subAgents: fc.array(
			fc.record({ agentId: fc.constant('ag-1'), useWhen: fc.option(text, { nil: undefined }) }),
			{
				maxLength: 1,
			},
		),
	})
	.map((ir) => agentIrSchema.parse(ir));

describe('compileAgent', () => {
	it('is deterministic, gives every tool a unique valid name, and documents every rule and tool', () => {
		fc.assert(
			fc.property(agentIr, (ir) => {
				const first = compileAgent(ir, { registry, defaultModel: catalog.defaultModel });
				expect(compileAgent(ir, { registry, defaultModel: catalog.defaultModel })).toEqual(first);
				const names = (first.config.tools ?? []).flatMap((t) =>
					t.type === 'custom' ? [] : [t.name],
				);
				expect(new Set(names).size).toBe(names.length);
				for (const name of names) expect(name).toMatch(/^[a-zA-Z0-9_-]{1,128}$/);
				expect(Object.keys(first.toolNames)).toHaveLength(ir.tools.length);
				expect(new Set(Object.values(first.toolNames))).toEqual(new Set(ir.tools.map((t) => t.id)));
				const instructions = renderInstructions(ir);
				expect(first.config.instructions).toBe(instructions);
				for (const rule of ir.instructions.rules) expect(instructions).toContain(rule);
				for (const t of ir.tools) expect(instructions).toContain(`**${t.name}**`);
				expect(instructions.includes('## Tools')).toBe(ir.tools.length + ir.subAgents.length > 0);
				const report = validateCompiledAgent(ir, first, catalog);
				expect(report.schema).toBe('pass');
				expect(report.references).toBe('pass');
				const scenarios = enumerateAgentScenarios(ir, first.toolNames);
				expect(scenarios.filter((s) => s.kind === 'tool')).toHaveLength(ir.tools.length);
				const runs = scenarios.map((s) => ({
					scenarioId: s.id,
					response: 'ok',
					toolCalls: s.expectedTools,
					status: 'completed' as const,
				}));
				const all = scenarioCoverage(scenarios, runs);
				expect(all.covered).toBe(all.total);
			}),
			{ numRuns: 80 },
		);
	});
});

describe('applyAgentPatches', () => {
	const baseConfig = (tools: AgentJsonConfig['tools']): AgentJsonConfig => ({
		name: 'Agent',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: '# Role\nHelp.',
		tools,
	});
	const patch = (toolNames: string[]): fc.Arbitrary<AgentPatch> =>
		fc.oneof(
			fc.record({ op: fc.constant('rename' as const), name: text }),
			fc.record({
				op: fc.constant('add_tool' as const),
				tool: ident.map((name) => ({ type: 'custom' as const, id: `custom-${name}` })),
			}),
			fc.record({
				op: fc.constant('remove_tool' as const),
				toolName: fc.constantFrom(...toolNames, 'missing'),
			}),
			fc.record({
				op: fc.constant('set_channel' as const),
				integration: fc.record({
					type: fc.constantFrom('slack' as const, 'telegram' as const),
					credentialId: ident,
				}),
			}),
			fc.record({
				op: fc.constant('remove_channel' as const),
				type: fc.constantFrom('slack', 'telegram'),
			}),
			fc.record({
				op: fc.constant('set_memory' as const),
				observational: fc.boolean(),
				episodic: fc.boolean(),
			}),
			fc.record({ op: fc.constant('set_web_search' as const), enabled: fc.boolean() }),
			fc.record({ op: fc.constant('append_rule' as const), rule: text }),
			fc.record({ op: fc.constant('add_sub_agent' as const), agentId: ident }),
			fc.record({ op: fc.constant('remove_sub_agent' as const), agentId: ident }),
			fc.record({
				op: fc.constant('set_approval' as const),
				toolName: fc.constantFrom(...toolNames, 'missing'),
				requireApproval: fc.boolean(),
			}),
		);

	it('never mutates the input and keeps the config internally consistent', () => {
		fc.assert(
			fc.property(
				fc.array(ident, { maxLength: 3 }).chain((names) => {
					const tools = names.map((name) => ({ type: 'custom' as const, id: name }));
					return fc.tuple(fc.constant(baseConfig(tools)), fc.array(patch(names), { maxLength: 8 }));
				}),
				([config, patches]) => {
					const before = JSON.stringify(config);
					let result: ReturnType<typeof applyAgentPatches> | undefined;
					try {
						result = applyAgentPatches(config, patches);
					} catch (error) {
						expect(String(error)).toContain('does not exist');
					}
					expect(JSON.stringify(config)).toBe(before);
					if (!result) return;
					const types = (result.config.integrations ?? []).map((i) => i.type);
					expect(new Set(types).size).toBe(types.length);
					const agents = (result.config.subAgents?.agents ?? []).map((a) => a.agentId);
					expect(new Set(agents).size).toBe(agents.length);
					const rules = patches.filter((p) => p.op === 'append_rule');
					for (const rule of rules)
						expect(result.config.instructions).toContain(rule.rule.replace(/^[-*]\s*/, '').trim());
					expect(
						(result.config.instructions.match(/^## Rules$/gm) ?? []).length,
					).toBeLessThanOrEqual(1);
					const memory = result.config.memory;
					if (memory)
						expect(memory.enabled).toBe(
							memory.observationalMemory?.enabled || memory.episodicMemory?.enabled,
						);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('adding then removing a tool is the identity on the tool list', () => {
		fc.assert(
			fc.property(fc.array(ident, { maxLength: 3 }), ident, (names, added) => {
				const config = baseConfig(names.map((name) => ({ type: 'custom' as const, id: name })));
				const id = `added-${added}`;
				const { config: after } = applyAgentPatches(config, [
					{ op: 'add_tool', tool: { type: 'custom', id } },
					{ op: 'remove_tool', toolName: id },
				]);
				expect(after.tools).toEqual(config.tools);
			}),
		);
	});
});

describe('text extraction never throws', () => {
	it('detectEditKind, detectChannels and extractAgentRequirements accept any string', () => {
		fc.assert(
			fc.property(fc.string({ maxLength: 200 }), (input) => {
				expect(() => detectEditKind(input)).not.toThrow();
				for (const mention of detectChannels(input)) expect(mention.name.length).toBeGreaterThan(0);
				const requirements = extractAgentRequirements(input);
				expect(['resolved', 'missing', 'ambiguous']).toContain(requirements.purpose.status);
			}),
			{ numRuns: 200 },
		);
	});
});
