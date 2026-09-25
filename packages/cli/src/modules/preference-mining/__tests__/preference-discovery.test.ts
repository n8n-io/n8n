import type { OutboundHttp } from '@n8n/backend-network';
import type { InstanceAiContext } from '@n8n/instance-ai';
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import { mock } from 'vitest-mock-extended';

import type { LabDataset } from '../../workflow-index/preference-mining/lab-types';
import { runPreferenceDiscovery } from '../preference-discovery';

vi.mock('@/utils/ai-proxy-fetch', () => ({
	createAiProxyFetch: () => () => {
		throw new Error('The model fixture must not use the network.');
	},
}));

const projectId = 'project-1';
const folderId = 'folder-1';
const nodeType = 'n8n-nodes-base.postgres';
const credentialId = 'credential-1';
const usageResult = {
	eligibleWorkflowCount: 3,
	unavailableWorkflowCount: 0,
	credentials: [{ id: credentialId, name: 'Database', type: 'postgres', workflowCount: 3 }],
	workflowsInScope: 3,
	coverage: { totalWorkflows: 3, indexedWorkflows: 3, complete: true },
	truncated: false,
	scope: { projectId, folderId, recursive: true },
};
const credentialUsage = vi.fn().mockResolvedValue(usageResult);
const context = mock<InstanceAiContext>({
	userId: 'user-1',
	projectId,
	workflowService: mock<InstanceAiContext['workflowService']>({ nodeUsage: vi.fn() }),
	credentialService: mock<InstanceAiContext['credentialService']>({ usage: credentialUsage }),
	workspaceService: mock<NonNullable<InstanceAiContext['workspaceService']>>(),
});
const outboundHttp = mock<OutboundHttp>();
const data: LabDataset = {
	version: 1,
	name: 'Discovery fixture',
	projects: [{ id: projectId, name: 'Project' }],
	folders: [{ id: folderId, name: 'Reports', projectId }],
	credentials: [
		{ id: credentialId, name: 'Database', type: 'postgres', projectIds: [projectId], usable: true },
	],
	groups: [],
	dimensions: [],
	workflows: [],
	threads: [],
	probes: [],
};
const finding = {
	category: 'credential',
	key: `credential:postgres:${nodeType}`,
	value: credentialId,
	condition: 'When adding Postgres nodes in Reports or its subfolders.',
	instruction: 'Prefer the Database credential (credential-1). Preserve existing bindings.',
	rationale: 'All three workflows use this credential. Coverage is complete.',
	folderId,
	includeSubfolders: true,
	contexts: [nodeType],
	evidenceIds: ['evidence-1'],
};
const usage = {
	inputTokens: { total: 100, noCache: 70, cacheRead: 20, cacheWrite: 10 },
	outputTokens: { total: 20, text: 20, reasoning: 0 },
};
type ModelResponse = Awaited<ReturnType<MockLanguageModelV3['doGenerate']>>;
function textResponse(preferences: unknown[]): ModelResponse {
	return {
		content: [{ type: 'text', text: JSON.stringify({ preferences, observations: [], notes: [] }) }],
		finishReason: { unified: 'stop', raw: 'end_turn' },
		usage,
		warnings: [],
	};
}
function toolResponse(toolName: string, input: unknown): ModelResponse {
	return {
		content: [{ type: 'tool-call', toolCallId: toolName, toolName, input: JSON.stringify(input) }],
		finishReason: { unified: 'tool-calls', raw: 'tool_use' },
		usage,
		warnings: [],
	};
}
const skillResponse = toolResponse('load_skill', { skillId: 'preference-discovery' });
const usageResponse = toolResponse('credentials', {
	action: 'usage',
	folderId,
	recursive: true,
	credentialType: 'postgres',
	nodeType,
});

async function run(responses: ModelResponse[], withSkill = true) {
	type StreamResponse = Awaited<ReturnType<MockLanguageModelV3['doStream']>>;
	type StreamPart = StreamResponse['stream'] extends ReadableStream<infer Part> ? Part : never;
	const model = new MockLanguageModelV3({
		doStream: responses.map((response) => {
			const chunks: StreamPart[] = [{ type: 'stream-start', warnings: [] }];
			for (const part of response.content) {
				if (part.type === 'text')
					chunks.push(
						{ type: 'text-start', id: 'text' },
						{ type: 'text-delta', id: 'text', delta: part.text },
						{ type: 'text-end', id: 'text' },
					);
				else if (part.type === 'tool-call') chunks.push(part);
			}
			chunks.push({ type: 'finish', finishReason: response.finishReason, usage: response.usage });
			return { stream: convertArrayToReadableStream(chunks) };
		}),
	});
	const result = await runPreferenceDiscovery({
		context,
		config: model,
		outboundHttp,
		data,
		task: 'Find conventions in this project.',
		withSkill,
		signal: new AbortController().signal,
		maxOutputTokens: 2048,
		pricing: {
			modelId: 'fixture',
			source: 'models.dev',
			resolvedAt: '2026-01-01T00:00:00Z',
			input: 2,
			output: 10,
			cacheRead: 0.2,
			cacheWrite: 2.5,
		},
		progress: vi.fn(),
	});
	return { result, model };
}

describe('preference discovery', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		credentialUsage.mockResolvedValue(usageResult);
	});

	it.each([false, true])('accepts supported findings with skill enabled: %s', async (withSkill) => {
		const responses = [
			...(withSkill ? [skillResponse] : []),
			usageResponse,
			textResponse([finding]),
		];
		const { result } = await run(responses, withSkill);
		expect(result.status).toBe('complete');
		expect(result.preferences).toHaveLength(1);
		expect(result.preferences[0].content).toContain('Prefer credential credential-1');
		expect(result.preferences[0].content).toContain(
			'Preserve existing bindings and explicit user choices.',
		);
		expect(result.preferences[0].content).not.toContain('three workflows');
		expect(result.preferences[0].evidenceSummary).toBe(finding.rationale);
		expect(result.metrics.modelCalls).toBe(responses.length);
		expect(result.metrics.calls?.some((call) => call.sourceId === 'output-repair')).toBe(false);
	});

	it('keeps a leading credential with alternatives as a suggestion', async () => {
		credentialUsage.mockResolvedValue({
			...usageResult,
			eligibleWorkflowCount: 4,
			credentials: [...usageResult.credentials, { id: 'credential-2', workflowCount: 1 }],
		});
		const { result } = await run([
			skillResponse,
			usageResponse,
			textResponse([
				{
					...finding,
					instruction: 'Bind this credential to all matching nodes.',
				},
			]),
		]);
		expect(result.status).toBe('complete');
		expect(result.preferences[0].application?.instruction).toContain(
			'Suggest credential credential-1',
		);
		expect(result.preferences[0].application?.instruction).toContain(
			'Ask for confirmation before binding.',
		);
		expect(result.preferences[0].content).not.toContain('Bind this credential');
	});

	it.each([
		{ credentials: [...usageResult.credentials, { id: 'credential-2', workflowCount: 3 }] },
		{ coverage: { ...usageResult.coverage, complete: false } },
		{ truncated: true },
		{ unavailableWorkflowCount: 1 },
	])('keeps unresolved credential choices out of candidates: %j', async (changes) => {
		credentialUsage.mockResolvedValue({ ...usageResult, ...changes });
		const { result } = await run([skillResponse, usageResponse, textResponse([finding])]);
		expect(result.status).toBe('complete');
		expect(result.preferences).toEqual([]);
		expect(result.observations).toHaveLength(1);
	});

	it('retains observations separately without requiring a candidate', async () => {
		const observation = {
			content: 'The usage does not establish a choice.',
			folderId,
			evidenceIds: ['evidence-1'],
		};
		const response = {
			...textResponse([]),
			content: [
				{
					type: 'text' as const,
					text: JSON.stringify({ preferences: [], observations: [observation], notes: [] }),
				},
			],
		};
		const { result } = await run([skillResponse, usageResponse, response]);
		expect(result.preferences).toEqual([]);
		expect(result.observations).toEqual([observation]);
	});

	it('repairs final output once and counts every billed response once', async () => {
		const { result, model } = await run([
			skillResponse,
			usageResponse,
			textResponse([{ ...finding, instruction: 'x'.repeat(301) }]),
			textResponse([finding]),
		]);
		expect(result.status).toBe('complete');
		expect(result.preferences).toHaveLength(1);
		expect(credentialUsage).toHaveBeenCalledTimes(1);
		expect(result.metrics).toMatchObject({
			modelCalls: 4,
			inputTokens: 400,
			outputTokens: 80,
			cachedInputTokens: 80,
			cacheWriteInputTokens: 40,
			usageComplete: true,
		});
		expect(result.metrics.estimatedCost).toBeCloseTo(
			(4 * (70 * 2 + 20 * 0.2 + 10 * 2.5 + 20 * 10)) / 1_000_000,
		);
		expect(result.metrics.calls?.[2]).toMatchObject({
			status: 'failed',
			failure: 'invalid-output',
			validationIssues: [{ path: 'preferences.0.instruction', code: 'too_big' }],
		});
		expect(result.metrics.calls?.[3]).toMatchObject({
			sourceId: 'output-repair',
			status: 'complete',
		});
		expect(model.doStreamCalls[3].tools).toBeUndefined();
	});

	it('stops after one unsuccessful format repair', async () => {
		const invalid = textResponse([{ ...finding, instruction: 'x'.repeat(301) }]);
		const { result, model } = await run([skillResponse, usageResponse, invalid, invalid]);
		expect(result.status).toBe('failed');
		expect(result.preferences).toEqual([]);
		expect(model.doStreamCalls).toHaveLength(4);
		expect(result.metrics.inputTokens).toBe(400);
		expect(result.metrics.calls?.at(-1)?.validationIssues).toEqual([
			{ path: 'preferences.0.instruction', code: 'too_big' },
		]);
	});

	it('keeps an output-limit failure and its usage without attempting repair', async () => {
		const truncated: ModelResponse = {
			...textResponse([]),
			content: [{ type: 'text', text: '{"preferences":[' }],
			finishReason: { unified: 'length', raw: 'max_tokens' },
		};
		const { result, model } = await run([skillResponse, usageResponse, truncated]);
		expect(result.status).toBe('failed');
		expect(result.preferences).toEqual([]);
		expect(model.doStreamCalls).toHaveLength(3);
		expect(result.metrics.inputTokens).toBe(300);
		expect(result.metrics.calls?.at(-1)?.failure).toBe('output-limit');
	});

	it('requires a successful skill load even after format repair', async () => {
		const { result } = await run([
			usageResponse,
			textResponse([{ ...finding, instruction: 'x'.repeat(301) }]),
			textResponse([finding]),
		]);
		expect(result.status).toBe('failed');
		expect(result.preferences).toEqual([]);
		expect(result.notes).toContain(
			'The model did not load the preference-discovery skill. This run cannot represent the skill approach.',
		);
	});

	it.each([
		{ value: 'unknown-credential' },
		{ folderId: 'unknown-folder' },
		{ contexts: ['n8n-nodes-base.slack'] },
		{ evidenceIds: ['missing-evidence'] },
	])('rejects unsupported repaired findings: %j', async (change) => {
		const { result } = await run([
			skillResponse,
			usageResponse,
			textResponse([{ ...finding, instruction: 'x'.repeat(301) }]),
			textResponse([{ ...finding, ...change }]),
		]);
		expect(result.preferences).toEqual([]);
		expect(result.notes).toContain(
			'Rejected finding 1: its source references or scope could not be verified.',
		);
	});
});
