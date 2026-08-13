import type { TextStreamPart, ToolSet } from 'ai';

import { chainHarnessStreams } from '../harness/stream';

function streamOf(
	...parts: Array<TextStreamPart<ToolSet>>
): ReadableStream<TextStreamPart<ToolSet>> {
	return new ReadableStream({
		start(controller) {
			for (const part of parts) controller.enqueue(part);
			controller.close();
		},
	});
}

async function readAll<T>(stream: ReadableStream<T>): Promise<T[]> {
	const result: T[] = [];
	for await (const value of stream) result.push(value);
	return result;
}

describe('chainHarnessStreams', () => {
	it('drains a suspended turn before starting the fresh prompt stream', async () => {
		const oldText = { type: 'text-delta', id: 'old', text: 'old' } as TextStreamPart<ToolSet>;
		const oldFinish = { type: 'finish', finishReason: 'stop' } as TextStreamPart<ToolSet>;
		const newText = { type: 'text-delta', id: 'new', text: 'new' } as TextStreamPart<ToolSet>;
		const newFinish = { type: 'finish', finishReason: 'stop' } as TextStreamPart<ToolSet>;
		const next = vi.fn().mockResolvedValue(streamOf(newText, newFinish));

		const values = await readAll(chainHarnessStreams(streamOf(oldText, oldFinish), next));

		expect(values).toEqual([oldText, newText, newFinish]);
		expect(next).toHaveBeenCalledOnce();
	});

	it('does not create the fresh stream until the suspended stream is consumed', async () => {
		const next = vi.fn().mockResolvedValue(streamOf());
		const stream = chainHarnessStreams(streamOf(), next);

		expect(next).not.toHaveBeenCalled();
		await readAll(stream);
		expect(next).toHaveBeenCalledOnce();
	});
});
