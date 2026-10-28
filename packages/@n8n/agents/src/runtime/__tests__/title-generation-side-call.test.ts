import type * as AiImport from 'ai';
import type { LanguageModel } from 'ai';

import type { SideCallUsageReport } from '../../types/sdk/agent';
import type { BuiltMemory } from '../../types';
import { generateThreadTitle } from '../memory/title-generation';
import { InMemoryMemory } from '../memory/memory-store';

type GenerateTextResult = {
	text: string;
	usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
	providerMetadata?: Record<string, unknown>;
};

const { mockGenerateText, mockGetModelCost } = vi.hoisted(() => ({
	mockGenerateText: vi.fn<(...args: unknown[]) => Promise<GenerateTextResult>>(),
	mockGetModelCost: vi.fn<(...args: [string]) => Promise<unknown>>(),
}));

vi.mock('ai', async () => {
	const actual = await vi.importActual<typeof AiImport>('ai');
	return {
		...actual,
		generateText: async (...args: unknown[]) => {
			const result = await mockGenerateText(...args);
			return { ...result, finalStep: { providerMetadata: result.providerMetadata } };
		},
	};
});

vi.mock('../model/model-factory', () => ({
	createModel: () => ({}) as LanguageModel,
}));

vi.mock('../../sdk/catalog', async (importOriginal) => ({
	...(await importOriginal<{}>()),
	getModelCost: mockGetModelCost,
}));

const THREAD_ID = 'thread-1';
const RESOURCE_ID = 'user-1';
const MODEL_ID = 'openai/gpt-4o';

async function runTitle(
	memory: BuiltMemory,
	onSideCallUsage?: (report: SideCallUsageReport) => void,
): Promise<SideCallUsageReport[]> {
	const reports: SideCallUsageReport[] = [];
	await generateThreadTitle({
		memory,
		threadId: THREAD_ID,
		resourceId: RESOURCE_ID,
		titleConfig: { model: MODEL_ID },
		telemetry: {
			enabled: true,
			recordInputs: false,
			recordOutputs: false,
			integrations: [],
			functionId: 'helper-title',
		},
		agentModel: MODEL_ID,
		turnDelta: [
			{
				id: 'm1',
				role: 'user',
				content: [{ type: 'text', text: 'Build a daily Berlin rain alert workflow' }],
				createdAt: new Date(),
			} as never,
		],
		onSideCallUsage: onSideCallUsage ?? ((report) => reports.push(report)),
	});
	return reports;
}

describe('generateThreadTitle side-call cost', () => {
	beforeEach(() => {
		mockGenerateText.mockReset();
		mockGetModelCost.mockReset();
	});

	it('forwards a priced title usage report to onSideCallUsage', async () => {
		mockGenerateText.mockResolvedValue({
			text: '{"title":"Berlin rain alert","emoji":"rain"}',
			usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
		});
		mockGetModelCost.mockResolvedValue({ input: 5, output: 15 });

		const memory = new InMemoryMemory();
		await memory.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });

		const reports = await runTitle(memory);

		expect(mockGenerateText).toHaveBeenCalledWith(
			expect.objectContaining({
				telemetry: expect.objectContaining({ isEnabled: true, functionId: 'helper-title' }),
			}),
		);
		expect(reports).toHaveLength(1);
		const report = reports[0];
		expect(report.task).toBe('title');
		expect(report.model).toBe(MODEL_ID);
		expect(report.usage.promptTokens).toBe(100);
		expect(report.usage.completionTokens).toBe(50);
		// 100 input tokens at $5/M = $0.0005; 50 output at $15/M = $0.00075.
		expect(report.cost).toBeCloseTo(0.00125, 7);
		expect(report.reportId).toEqual(expect.any(String));
	});

	it('prices and reports a Foundry deployment by the model it serves', async () => {
		mockGenerateText.mockResolvedValue({
			text: '{"title":"Berlin rain alert","emoji":"rain"}',
			usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
		});
		mockGetModelCost.mockResolvedValue({ input: 5, output: 15 });
		const memory = new InMemoryMemory();
		await memory.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });
		const reports: SideCallUsageReport[] = [];
		const modelFetch = vi.fn<typeof fetch>();
		const foundryModel = {
			id: 'azure-openai/my-chat',
			catalogModelId: 'azure-openai/gpt-4.1',
			apiKey: 'az-key',
			endpointType: 'foundry',
			baseURL: 'https://my-resource.services.ai.azure.com/openai/v1',
		};

		await generateThreadTitle({
			memory,
			threadId: THREAD_ID,
			resourceId: RESOURCE_ID,
			titleConfig: { model: foundryModel },
			agentModel: foundryModel,
			modelFetch,
			turnDelta: [
				{
					id: 'm1',
					role: 'user',
					content: [{ type: 'text', text: 'Build a daily Berlin rain alert workflow' }],
					createdAt: new Date(),
				} as never,
			],
			onSideCallUsage: (report) => {
				reports.push(report);
			},
		});

		expect(mockGetModelCost).toHaveBeenCalledWith('azure-openai/gpt-4.1', modelFetch);
		expect(reports[0].model).toBe('azure-openai/gpt-4.1');
	});

	it('forwards a priced title usage report even when the model returns no usable title', async () => {
		// The model was called and billed, but produced empty text.
		mockGenerateText.mockResolvedValue({
			text: '',
			usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
		});
		mockGetModelCost.mockResolvedValue({ input: 5, output: 15 });

		const memory = new InMemoryMemory();
		await memory.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });

		const reports = await runTitle(memory);

		expect(reports).toHaveLength(1);
		expect(reports[0].task).toBe('title');
		// The thread is not retitled when no title could be extracted.
		const thread = await memory.getThread(THREAD_ID);
		expect(thread?.title).toBeFalsy();
	});

	it('forwards a priced title usage report even when saveThread throws', async () => {
		mockGenerateText.mockResolvedValue({
			text: '{"title":"Berlin rain alert","emoji":"rain"}',
			usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
		});
		mockGetModelCost.mockResolvedValue({ input: 5, output: 15 });

		const memory = new InMemoryMemory();
		await memory.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });
		// Force persistence to fail after the model call has already been billed.
		vi.spyOn(memory, 'saveThread').mockRejectedValue(new Error('storage down'));

		const reports = await runTitle(memory);

		// The report is captured before persistence, so the billed turn is
		// still priced even though saving the title failed.
		expect(reports).toHaveLength(1);
		expect(reports[0].task).toBe('title');
	});

	it('forwards a report without cost when the model has no catalog pricing', async () => {
		mockGenerateText.mockResolvedValue({
			text: '{"title":"Berlin rain alert","emoji":"rain"}',
			usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
		});
		mockGetModelCost.mockResolvedValue(undefined);

		const memory = new InMemoryMemory();
		await memory.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });

		const reports = await runTitle(memory);
		expect(reports).toHaveLength(1);
		const report = reports[0];
		expect(report.task).toBe('title');
		expect(report.model).toBe(MODEL_ID);
		expect(report.usage.promptTokens).toBe(100);
		expect(report.usage.completionTokens).toBe(50);
		expect(report).not.toHaveProperty('cost');
	});

	it('does not forward a report when the LLM reports no usage', async () => {
		mockGenerateText.mockResolvedValue({ text: '{"title":"Berlin rain alert","emoji":"rain"}' });
		mockGetModelCost.mockResolvedValue({ input: 5, output: 15 });

		const memory = new InMemoryMemory();
		await memory.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });

		const reports = await runTitle(memory);
		expect(reports).toHaveLength(0);
	});

	it('mints a unique reportId for each title call', async () => {
		mockGenerateText.mockResolvedValue({
			text: '{"title":"Berlin rain alert","emoji":"rain"}',
			usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
		});
		mockGetModelCost.mockResolvedValue({ input: 5, output: 15 });

		const memory = new InMemoryMemory();
		await memory.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });

		const first = await runTitle(memory);
		// A second thread so the title is not skipped as already set.
		const memory2 = new InMemoryMemory();
		await memory2.saveThread({ id: 'thread-2', resourceId: RESOURCE_ID });
		const second = await runTitle(memory2);

		expect(first[0].reportId).not.toBe(second[0].reportId);
	});

	it('skips the cost report when the thread already has a title', async () => {
		mockGenerateText.mockResolvedValue({
			text: '{"title":"Berlin rain alert","emoji":"rain"}',
			usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
		});
		mockGetModelCost.mockResolvedValue({ input: 5, output: 15 });

		const memory = new InMemoryMemory();
		await memory.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID, title: 'Existing title' });

		const reports = await runTitle(memory);
		expect(reports).toHaveLength(0);
		expect(mockGenerateText).not.toHaveBeenCalled();
	});
});

describe('generateThreadTitle persistence', () => {
	beforeEach(() => {
		mockGenerateText.mockReset();
		mockGetModelCost.mockReset();
		mockGetModelCost.mockResolvedValue(undefined);
	});

	/** Changes the thread metadata while the title model call runs. */
	function changeMetadataDuringTitleCall(
		memory: InMemoryMemory,
		text: string,
		metadata: Record<string, unknown>,
	) {
		mockGenerateText.mockImplementation(async () => {
			await memory.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID, metadata });
			return { text, usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 } };
		});
	}

	it('keeps metadata that changed during the title call when there is no emoji', async () => {
		const memory = new InMemoryMemory();
		await memory.saveThread({
			id: THREAD_ID,
			resourceId: RESOURCE_ID,
			metadata: { markers: ['wf-1'] },
		});
		changeMetadataDuringTitleCall(memory, 'Berlin rain alert', { markers: [] });

		await runTitle(memory, () => {});

		const thread = await memory.getThread(THREAD_ID);
		expect(thread?.title).toBe('Berlin rain alert');
		expect(thread?.metadata).toEqual({ markers: [] });
	});

	it('adds the emoji to the metadata as it is after the title call', async () => {
		const memory = new InMemoryMemory();
		await memory.saveThread({
			id: THREAD_ID,
			resourceId: RESOURCE_ID,
			metadata: { markers: ['wf-1'] },
		});
		changeMetadataDuringTitleCall(memory, '{"title":"Berlin rain alert","emoji":"🌧️"}', {
			markers: [],
			source: 'chat',
		});

		await runTitle(memory, () => {});

		const thread = await memory.getThread(THREAD_ID);
		expect(thread?.title).toBe('Berlin rain alert');
		expect(thread?.metadata).toEqual({ markers: [], source: 'chat', emoji: '🌧️' });
	});
});

describe('generateThreadTitle title text', () => {
	const contextInput = [
		{
			id: 'm1',
			role: 'user',
			content: [
				{
					type: 'text',
					text: '<thread-context>Workflows: Morning digest, Lead sync. Today is Monday.</thread-context>\n\nhey',
				},
			],
			createdAt: new Date(),
		} as never,
	];

	async function titleWith(titleText: string) {
		const memory = new InMemoryMemory();
		await generateThreadTitle({
			memory,
			threadId: THREAD_ID,
			resourceId: RESOURCE_ID,
			titleConfig: { model: MODEL_ID },
			agentModel: MODEL_ID,
			turnDelta: contextInput,
			titleText,
		});
		return await memory.getThread(THREAD_ID);
	}

	beforeEach(() => {
		mockGenerateText.mockReset();
		mockGetModelCost.mockReset();
		mockGetModelCost.mockResolvedValue(undefined);
		mockGenerateText.mockResolvedValue({
			text: 'Berlin rain alert',
			usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
		});
	});

	it('titles the text that the host gives, not the turn input', async () => {
		const thread = await titleWith('Build a daily Berlin rain alert workflow');

		expect(thread?.title).toBe('Berlin rain alert');
		const [{ messages }] = mockGenerateText.mock.calls[0] as [
			{ messages: Array<{ content: string }> },
		];
		expect(messages[0].content).toContain('Build a daily Berlin rain alert workflow');
		expect(messages[0].content).not.toContain('thread-context');
	});

	it('waits for a later turn when the text that the host gives is trivial', async () => {
		const thread = await titleWith('hey');

		expect(mockGenerateText).not.toHaveBeenCalled();
		expect(thread?.title ?? null).toBeNull();
	});

	it('generates no title for an empty text from the host', async () => {
		await titleWith('');

		expect(mockGenerateText).not.toHaveBeenCalled();
	});
});
