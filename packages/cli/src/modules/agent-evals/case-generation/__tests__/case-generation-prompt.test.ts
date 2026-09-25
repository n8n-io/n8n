import type { AgentJsonConfig } from '@n8n/api-types';

import {
	buildAgentSummary,
	buildCaseGenerationUserPrompt,
	deriveCapabilities,
} from '../case-generation-prompt';
import type { DimensionTuple } from '../dimensions';

function config(over: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'Bot',
		model: 'anthropic/claude-sonnet-4-5',
		credential: 'cred-1',
		instructions: 'Do useful things.',
		...over,
	} as AgentJsonConfig;
}

describe('buildAgentSummary', () => {
	it('truncates very long instructions', () => {
		const summary = buildAgentSummary(config({ instructions: 'a'.repeat(5000) }));
		expect(summary.instructions).toHaveLength(4001); // 4000 chars + ellipsis
		expect(summary.instructions.endsWith('…')).toBe(true);
	});

	it('names tools by kind: custom→id, node/workflow→name (falling back to the kind)', () => {
		const summary = buildAgentSummary(
			config({
				tools: [
					{ type: 'custom', id: 'myTool' },
					{ type: 'node', name: 'lookupOrder', node: {}, description: 'looks up orders' },
					{ type: 'workflow', workflow: 'wf1' },
				] as AgentJsonConfig['tools'],
			}),
		);
		expect(summary.tools.map((t) => t.name)).toEqual(['myTool', 'lookupOrder', 'workflow']);
		expect(summary.tools[1].description).toBe('looks up orders');
		expect(summary.tools[0].description).toBeUndefined();
	});

	it('drops blank tool descriptions', () => {
		const summary = buildAgentSummary(
			config({
				tools: [
					{ type: 'node', name: 'n', node: {}, description: '   ' },
				] as AgentJsonConfig['tools'],
			}),
		);
		expect(summary.tools[0].description).toBeUndefined();
	});

	it('caps very long tool/capability labels', () => {
		const longName = 'n'.repeat(500);
		const cfg = config({
			tools: [{ type: 'node', name: longName, node: {} }] as AgentJsonConfig['tools'],
		});
		// 100-char cap + a single ellipsis character.
		expect(buildAgentSummary(cfg).tools[0].name.length).toBeLessThanOrEqual(101);
		expect(deriveCapabilities(cfg)[0].length).toBeLessThanOrEqual(101);
	});

	it('caps the number of tools in the summary', () => {
		const many = Array.from({ length: 40 }, (_, i) => ({
			type: 'node' as const,
			name: `tool${i}`,
			node: {},
		}));
		const summary = buildAgentSummary(config({ tools: many as AgentJsonConfig['tools'] }));
		expect(summary.tools).toHaveLength(30);
	});
});

describe('deriveCapabilities', () => {
	it('combines tools, skills, MCP servers, and vector stores, deduped', () => {
		const caps = deriveCapabilities(
			config({
				tools: [{ type: 'node', name: 'searchWeb', node: {} }] as AgentJsonConfig['tools'],
				skills: [{ id: 'writeEmail' }] as AgentJsonConfig['skills'],
				mcpServers: [{ name: 'github' }] as AgentJsonConfig['mcpServers'],
				vectorStores: [{ name: 'docs' }] as AgentJsonConfig['vectorStores'],
			}),
		);
		expect(caps).toEqual(expect.arrayContaining(['searchWeb', 'writeEmail', 'github', 'docs']));
	});

	it('returns empty when the agent declares no capabilities', () => {
		expect(deriveCapabilities(config())).toEqual([]);
	});
});

describe('buildCaseGenerationUserPrompt', () => {
	it('asks for exactly one case per tuple and names each capability', () => {
		const tuples: DimensionTuple[] = [
			{ capability: 'general', difficulty: 'simple', flavor: 'happy_path' },
			{ capability: 'searchWeb', difficulty: 'multi_step', flavor: 'adversarial' },
		];
		const prompt = buildCaseGenerationUserPrompt(buildAgentSummary(config()), tuples);
		expect(prompt).toContain('Write exactly 2');
		expect(prompt).toMatch(/^1\. /m);
		expect(prompt).toMatch(/^2\. /m);
		expect(prompt).toContain('searchWeb');
	});
});
