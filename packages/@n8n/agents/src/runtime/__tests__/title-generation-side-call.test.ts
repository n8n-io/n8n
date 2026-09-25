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
		generateText: async (...args: unknown[]) => await mockGenerateText(...args),
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

	it('does not forward a report when the model has no catalog pricing', async () => {
		mockGenerateText.mockResolvedValue({
			text: '{"title":"Berlin rain alert","emoji":"rain"}',
			usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
		});
		mockGetModelCost.mockResolvedValue(undefined);

		const memory = new InMemoryMemory();
		await memory.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });

		const reports = await runTitle(memory);
		expect(reports).toHaveLength(0);
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
