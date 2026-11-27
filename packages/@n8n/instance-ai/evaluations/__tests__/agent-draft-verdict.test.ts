import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentModelResolution } from '../credentials/model-resolver';
import { draftAgentVerdict, seededAgentResolution } from '../harness/agent-execution';
import type { AgentArtifact } from '../types';

const artifact = (config: Record<string, unknown>): AgentArtifact => ({ config, skills: {} });
const seeded = { name: 'Agent', model: 'anthropic/claude-sonnet-4-5', instructions: '' };

describe('draftAgentVerdict', () => {
	beforeEach(() => {
		vi.stubEnv('ANTHROPIC_API_KEY', '');
		vi.stubEnv('N8N_AI_ANTHROPIC_KEY', '');
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('lets a seeded Agent run when its declared credential has a real key', () => {
		vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');

		expect(
			draftAgentVerdict(artifact(seeded), [{ type: 'anthropicApi', realModelKey: true }], seeded),
		).toBeUndefined();
	});

	it('says the eval has no real key for an authored Anthropic credential, which keeps a placeholder', () => {
		vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');

		expect(draftAgentVerdict(artifact(seeded), [{ type: 'anthropicApi' }], seeded)?.execError).toBe(
			'No real key for anthropicApi',
		);
	});

	it('says the eval has no real key when the declared credential is a placeholder', () => {
		expect(draftAgentVerdict(artifact(seeded), [{ type: 'anthropicApi' }], seeded)).toEqual({
			attribution: 'framework_issue',
			reasoning:
				"The seeded Agent's model anthropic/claude-sonnet-4-5 needs a real anthropicApi key, and the eval has none, so its credential holds a placeholder that the provider would reject.",
			execError: 'No real key for anthropicApi',
		});
	});

	it('still reports a seeded model with no declared credential', () => {
		expect(draftAgentVerdict(artifact(seeded), [], seeded)?.execError).toBe(
			'Seeded Agent model has no declared credential',
		);
	});

	it('checks seeded memory worker models too', () => {
		vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
		const withObserver = {
			...seeded,
			memory: {
				enabled: true,
				storage: 'n8n',
				observationalMemory: {
					observerModel: { model: 'openai/gpt-4o-mini', credential: '[redacted]' },
				},
			},
		};

		expect(
			draftAgentVerdict(
				artifact(withObserver),
				[{ type: 'anthropicApi', realModelKey: true }],
				withObserver,
			),
		).toMatchObject({
			execError: 'Seeded Agent model has no declared credential',
			reasoning: expect.stringContaining('openai/gpt-4o-mini needs a openAiApi credential'),
		});
	});

	it('leaves a model the builder changed to the builder', () => {
		const built = { ...seeded, model: 'openai/gpt-5-mini' };

		expect(draftAgentVerdict(artifact(built), [{ type: 'openAiApi' }], seeded)).toBeUndefined();
	});

	it('marks the run skipped, not failed, when the resolver found no model mapping', () => {
		const resolution: AgentModelResolution = {
			modelResolution: 'skipped',
			originalModel: 'azure-openai/my-deployment',
			slots: [],
			droppedOptions: [],
			credentialTypes: [],
			embeddings: 'none',
			tags: [],
			skip: {
				kind: 'no-model-mapping',
				reason: 'no model mapping for azure-openai/my-deployment: no real key',
			},
		};

		expect(draftAgentVerdict(artifact(seeded), [], seeded, resolution)).toEqual({
			attribution: 'framework_issue',
			reasoning:
				'Skipped: no model mapping for azure-openai/my-deployment: no real key. The eval has no route to run this Agent on its own model or a comparable one.',
			execError: 'Skipped: no model mapping',
			incomplete: true,
		});
	});

	it('marks the run skipped when episodic memory has no embedding key', () => {
		const resolution: AgentModelResolution = {
			modelResolution: 'direct',
			slots: [],
			droppedOptions: [],
			credentialTypes: [],
			embeddings: 'no-embedding-key',
			tags: [],
			skip: { kind: 'no-embedding-key', reason: 'no embedding key: no OpenAI key is set' },
		};

		expect(draftAgentVerdict(artifact(seeded), [], seeded, resolution)).toEqual({
			attribution: 'framework_issue',
			reasoning: 'Skipped: no embedding key: no OpenAI key is set.',
			execError: 'Skipped: no embedding key',
			incomplete: true,
		});
	});

	it('reports a built Agent with no model', () => {
		expect(draftAgentVerdict(artifact({ ...seeded, model: '' }), [])?.execError).toBe(
			'Agent has no model configured',
		);
	});
});

describe('seededAgentResolution', () => {
	const resolution = (originalModel: string): AgentModelResolution => ({
		modelResolution: 'direct',
		originalModel,
		slots: [],
		droppedOptions: [],
		credentialTypes: [],
		embeddings: 'none',
		tags: [],
	});
	const resolutions = [resolution('a/first'), resolution('b/second')];

	it('picks the resolution of the restored agent under test', () => {
		expect(seededAgentResolution(resolutions, ['id-1', 'id-2'], 'id-2')).toBe(resolutions[1]);
	});

	it('has none for an agent the seed did not restore', () => {
		expect(seededAgentResolution(resolutions, ['id-1', 'id-2'], 'built')).toBeUndefined();
		expect(seededAgentResolution(undefined, ['id-1'], 'id-1')).toBeUndefined();
	});
});
