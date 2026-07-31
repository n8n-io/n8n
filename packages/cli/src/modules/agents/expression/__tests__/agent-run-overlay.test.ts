import type { AgentJsonConfig, AgentSkill } from '@n8n/api-types';
import type { NodeParameterValueType } from 'n8n-workflow';

import { AgentExpressionContext } from '../agent-expression-context';
import { createAgentRunOverlayFactory } from '../agent-run-overlay';

const expressions = {
	instructions: '={{ "Help the " + $vars.region + " team." }}',
	nodeDescription: '={{ "Send to " + $vars.region + " on Telegram." }}',
	skillDescription: '={{ "Guidance for " + $vars.region + "." }}',
	skillInstructions: '={{ "Follow the " + $vars.region + " procedure." }}',
	skillReference: '={{ "Reference for " + $vars.region + "." }}',
} as const;

const config: AgentJsonConfig = {
	name: 'expression-agent',
	model: 'openai/gpt-4o',
	instructions: expressions.instructions,
	config: { webSearch: { enabled: true } },
	tools: [
		{ type: 'custom', id: 'lookup' },
		{
			type: 'node',
			name: 'Telegram Send',
			description: expressions.nodeDescription,
			node: {
				nodeType: 'n8n-nodes-base.telegram',
				nodeTypeVersion: 1,
				nodeParameters: { channelId: '={{ $vars.region }}' },
			},
		},
	],
	skills: [{ type: 'skill', id: 'regional_help' }],
};

const skills: Record<string, AgentSkill> = {
	regional_help: {
		name: 'Regional help',
		description: expressions.skillDescription,
		instructions: expressions.skillInstructions,
		references: [{ path: 'references/region.md', content: expressions.skillReference }],
	},
};

function resolveExpression(value: string, region: string): string {
	const values: Record<string, string> = {
		[expressions.instructions]: `Help the ${region} team.`,
		[expressions.nodeDescription]: `Send to ${region} on Telegram.`,
		[expressions.skillInstructions]: `Follow the ${region} procedure.`,
	};
	return values[value] ?? value;
}

function expressionContext(region: string) {
	return new AgentExpressionContext({ region }, async (value) => {
		if (typeof value !== 'string') return value;
		return resolveExpression(value, region) as NodeParameterValueType;
	});
}

describe('createAgentRunOverlayFactory', () => {
	it('resolves only approved expression fields independently for each run', async () => {
		const seenValues: string[] = [];
		const createOverlay = createAgentRunOverlayFactory({ config, skills });
		const euContext = new AgentExpressionContext({ region: 'EU' }, async (value) => {
			if (typeof value !== 'string') return value;
			seenValues.push(value);
			return resolveExpression(value, 'EU') as NodeParameterValueType;
		});

		const eu = await createOverlay(euContext);
		const us = await createOverlay(expressionContext('US'));

		expect(eu.instructions).toContain('Help the EU team.');
		expect(eu.instructions).toContain('### Web search policy');
		expect(us.instructions).toContain('Help the US team.');
		expect(eu.skillSource?.registry.skills).toEqual([
			expect.objectContaining({
				id: 'regional_help',
				description: expressions.skillDescription,
			}),
		]);
		expect([...(eu.toolOverrides ?? new Map()).keys()]).toEqual(['Telegram_Send']);
		expect(eu.toolOverrides?.get('Telegram_Send')?.description).toBe('Send to EU on Telegram.');

		const skillSource = eu.skillSource;
		if (!skillSource?.loadFile) throw new Error('Expected a per-run skill source');
		expect((await skillSource.loadSkill('regional_help'))?.instructions).toBe(
			'Follow the EU procedure.',
		);
		expect((await skillSource.loadFile('regional_help', 'references/region.md'))?.content).toBe(
			expressions.skillReference,
		);

		expect(seenValues).toEqual([
			expressions.instructions,
			expressions.skillInstructions,
			expressions.nodeDescription,
		]);
		expect(config.instructions).toBe(expressions.instructions);
		expect(skills.regional_help).toEqual(
			expect.objectContaining({
				description: expressions.skillDescription,
				instructions: expressions.skillInstructions,
				references: [{ path: 'references/region.md', content: expressions.skillReference }],
			}),
		);
	});

	it('materializes node input schemas independently once per concurrent run', async () => {
		const snapshots: object[] = [];
		const createOverlay = createAgentRunOverlayFactory({
			config,
			skills,
			resolveNodeToolInputSchema: async (_tool, context) => {
				snapshots.push(structuredClone(context.variables));
				const property = String(context.variables.region);
				return await Promise.resolve({
					type: 'object',
					properties: { [property]: { type: 'string' } },
					required: [property],
				});
			},
		});

		const [eu, us] = await Promise.all([
			createOverlay(expressionContext('EU')),
			createOverlay(expressionContext('US')),
		]);

		expect(eu.toolOverrides?.get('Telegram_Send')?.inputSchema).toEqual(
			expect.objectContaining({ required: ['EU'] }),
		);
		expect(us.toolOverrides?.get('Telegram_Send')?.inputSchema).toEqual(
			expect.objectContaining({ required: ['US'] }),
		);
		expect(snapshots).toEqual([{ region: 'EU' }, { region: 'US' }]);
	});

	it.each([
		['instructions as non-text', expressions.instructions, 42, 'instructions'],
		[
			'oversize skill instructions',
			expressions.skillInstructions,
			'€'.repeat(21_846),
			'skills.regional_help.instructions',
		],
	])('rejects %s with a safe field path', async (_case, expression, resolved, fieldPath) => {
		const createOverlay = createAgentRunOverlayFactory({ config, skills });
		const context = new AgentExpressionContext({}, async (value) =>
			value === expression ? (resolved as NodeParameterValueType) : value,
		);

		await expect(createOverlay(context)).rejects.toThrow(fieldPath);
	});

	it('redacts expression failures and leaves cached sources raw', async () => {
		const createOverlay = createAgentRunOverlayFactory({ config, skills });
		const context = new AgentExpressionContext({}, async (value) => {
			if (value === expressions.skillInstructions) throw new Error('private expression value');
			return value;
		});

		await expect(createOverlay(context)).rejects.toThrow('skills.regional_help.instructions');
		await expect(createOverlay(context)).rejects.not.toThrow('private expression value');
		expect(config.instructions).toBe(expressions.instructions);
		expect(skills.regional_help?.instructions).toBe(expressions.skillInstructions);
	});
});
