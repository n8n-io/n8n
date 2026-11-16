import type { AgentMessageList } from '../model/message-list';
import { RequestSizeTracker } from '../memory/request-size-tracker';

/** Each message's text is its token count, so sizes read directly from the test. */
const countDigits = async (text: string) =>
	await Promise.resolve(Number(/\d+/.exec(text)?.[0] ?? 0));

function listOf(...sizes: number[]): AgentMessageList {
	const messages = sizes.map((size, i) => ({
		id: `m${i}`,
		role: 'user' as const,
		content: [{ type: 'text' as const, text: String(size) }],
	}));
	return { llmVisibleMessages: () => messages } as unknown as AgentMessageList;
}

describe('RequestSizeTracker', () => {
	it('uses the visible estimate before any call is measured', async () => {
		const tracker = new RequestSizeTracker(countDigits);

		expect(await tracker.estimate(listOf(1_000))).toBe(1_000);
	});

	it('adds messages since the last call to the measured size', async () => {
		const tracker = new RequestSizeTracker(countDigits);
		await tracker.record(listOf(10_000), 50_000);

		expect(await tracker.estimate(listOf(10_000))).toBe(50_000);
		expect(await tracker.estimate(listOf(10_000, 2_500))).toBe(52_500);
	});

	it('subtracts messages masked since the last call', async () => {
		const tracker = new RequestSizeTracker(countDigits);
		await tracker.record(listOf(6_000, 4_000), 50_000);

		const masked = listOf(6_000, 4_000);
		const visible = masked.llmVisibleMessages().slice(1);
		masked.llmVisibleMessages = () => visible;
		expect(await tracker.estimate(masked)).toBe(44_000);
		expect(tracker.messageTokens('m0')).toBe(0);
	});

	it('falls back to the visible estimate plus the last overhead after invalidation', async () => {
		const tracker = new RequestSizeTracker(countDigits);
		await tracker.record(listOf(10_000), 50_000);
		tracker.invalidate();

		expect(await tracker.estimate(listOf(10_000))).toBe(50_000);
	});

	it('ignores calls without reported input tokens', async () => {
		const tracker = new RequestSizeTracker(countDigits);
		await tracker.record(listOf(10_000), 50_000);
		await tracker.record(listOf(10_000, 10_000), 0);

		expect(await tracker.estimate(listOf(10_000))).toBe(50_000);
	});

	it('starts from a seeded size', async () => {
		const tracker = new RequestSizeTracker(countDigits);
		tracker.seed(30_000, 10_000);

		expect(await tracker.estimate(listOf(10_000, 1_000))).toBe(31_000);
	});

	it('never reports a negative overhead when the estimate exceeds the measurement', async () => {
		const tracker = new RequestSizeTracker(countDigits);
		await tracker.record(listOf(8_000), 5_000);
		tracker.invalidate();

		expect(await tracker.estimate(listOf(8_000))).toBe(8_000);
	});
});
