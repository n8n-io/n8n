import type { StructuredChunk } from 'n8n-workflow';

import { createStructuredChunkAggregator } from '../stream-capturer';

const metadata = (overrides: Partial<StructuredChunk['metadata']> = {}) => ({
	nodeId: 'node-1',
	nodeName: 'AI Agent',
	runIndex: 0,
	itemIndex: 0,
	timestamp: 1,
	...overrides,
});

describe('createStructuredChunkAggregator', () => {
	it('aggregates begin/item/end chunks into one message', async () => {
		const onBegin = vi.fn();
		const onItem = vi.fn();
		const onEnd = vi.fn();
		const { ingest } = createStructuredChunkAggregator('prev-id', null, {
			onBegin,
			onItem,
			onEnd,
		});

		await ingest({ type: 'begin', metadata: metadata() });
		await ingest({ type: 'item', content: 'Hello', metadata: metadata() });
		const message = await ingest({ type: 'end', metadata: metadata() });

		expect(onBegin).toHaveBeenCalledTimes(1);
		expect(onItem).toHaveBeenCalledWith(expect.objectContaining({ content: 'Hello' }), 'Hello');
		expect(onEnd).toHaveBeenCalledTimes(1);
		expect(message?.status).toBe('success');
	});

	it('ignores node lifecycle and tool progress chunks', async () => {
		const onBegin = vi.fn();
		const onError = vi.fn();
		const { ingest } = createStructuredChunkAggregator('prev-id', null, {
			onBegin,
			onError,
		});

		const ignoredTypes: Array<StructuredChunk['type']> = [
			'node-execute-before',
			'node-execute-after',
			'tool-call-start',
			'tool-call-end',
		];
		for (const type of ignoredTypes) {
			const result = await ingest({
				type,
				metadata: metadata({ toolName: 'List_Folder' }),
			});
			expect(result).toBeNull();
		}

		expect(onBegin).not.toHaveBeenCalled();
		expect(onError).not.toHaveBeenCalled();
	});
});
