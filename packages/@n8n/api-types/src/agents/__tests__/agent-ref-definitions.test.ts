import { AgentJsonConfigSchema, type AgentJsonConfig } from '../agent-json-config.schema';
import {
	extractRefDefinitions,
	inlineRefDefinitions,
	type AgentRefDefinitions,
} from '../agent-ref-definitions';

const baseConfig: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help users',
};

const definitions: AgentRefDefinitions = {
	skills: {
		'skill-1': { name: 'Refunds', description: 'Issue refunds', instructions: 'Be careful' },
	},
	tasks: {
		'task-1': { name: 'Daily digest', objective: 'Summarise', cronExpression: '0 9 * * *' },
	},
};

describe('inlineRefDefinitions', () => {
	it('attaches the body each ref points at', () => {
		const inlined = inlineRefDefinitions(
			{
				...baseConfig,
				skills: [{ type: 'skill', id: 'skill-1' }],
				tasks: [{ type: 'task', id: 'task-1', enabled: true }],
			},
			definitions,
		);

		expect(inlined.skills).toEqual([
			{ type: 'skill', id: 'skill-1', definition: definitions.skills['skill-1'] },
		]);
		expect(inlined.tasks).toEqual([
			{ type: 'task', id: 'task-1', enabled: true, definition: definitions.tasks['task-1'] },
		]);
	});

	it('leaves a ref alone when its body is missing, rather than dropping it', () => {
		const inlined = inlineRefDefinitions(
			{ ...baseConfig, tasks: [{ type: 'task', id: 'orphan', enabled: false }] },
			definitions,
		);

		expect(inlined.tasks).toEqual([{ type: 'task', id: 'orphan', enabled: false }]);
	});

	it('leaves a config without skills or tasks untouched', () => {
		expect(inlineRefDefinitions(baseConfig, definitions)).toEqual(baseConfig);
	});
});

describe('extractRefDefinitions', () => {
	it('returns a refs-only config plus the bodies it carried', () => {
		const { config, definitions: extracted } = extractRefDefinitions({
			...baseConfig,
			skills: [{ type: 'skill', id: 'skill-1', definition: definitions.skills['skill-1'] }],
			tasks: [
				{ type: 'task', id: 'task-1', enabled: true, definition: definitions.tasks['task-1'] },
			],
		});

		expect(config.skills).toEqual([{ type: 'skill', id: 'skill-1' }]);
		expect(config.tasks).toEqual([{ type: 'task', id: 'task-1', enabled: true }]);
		expect(extracted).toEqual(definitions);
	});

	it('reports no definitions for a config that only carries refs', () => {
		const refsOnly: AgentJsonConfig = {
			...baseConfig,
			skills: [{ type: 'skill', id: 'skill-1' }],
			tasks: [{ type: 'task', id: 'task-1', enabled: true }],
		};

		const { config, definitions: extracted } = extractRefDefinitions(refsOnly);

		expect(config).toEqual(refsOnly);
		expect(extracted).toEqual({ skills: {}, tasks: {} });
	});

	it('round-trips with inlineRefDefinitions', () => {
		const refsOnly: AgentJsonConfig = {
			...baseConfig,
			skills: [{ type: 'skill', id: 'skill-1' }],
			tasks: [{ type: 'task', id: 'task-1', enabled: true }],
		};

		const roundTripped = extractRefDefinitions(inlineRefDefinitions(refsOnly, definitions));

		expect(roundTripped.config).toEqual(refsOnly);
		expect(roundTripped.definitions).toEqual(definitions);
	});
});

describe('AgentJsonConfigSchema', () => {
	// An exported file is re-validated on import, so the schema has to preserve
	// the inlined bodies instead of stripping them as unknown keys.
	it('keeps inlined skill and task definitions through validation', () => {
		const parsed = AgentJsonConfigSchema.parse({
			...baseConfig,
			skills: [{ type: 'skill', id: 'skill-1', definition: definitions.skills['skill-1'] }],
			tasks: [
				{ type: 'task', id: 'task-1', enabled: true, definition: definitions.tasks['task-1'] },
			],
		});

		expect(parsed.skills?.[0].definition).toEqual(definitions.skills['skill-1']);
		expect(parsed.tasks?.[0].definition).toEqual(definitions.tasks['task-1']);
	});

	it('rejects an inlined task definition that is missing its objective', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			tasks: [
				{
					type: 'task',
					id: 'task-1',
					enabled: true,
					definition: { name: 'Daily digest', cronExpression: '0 9 * * *' },
				},
			],
		});

		expect(result.success).toBe(false);
	});
});
