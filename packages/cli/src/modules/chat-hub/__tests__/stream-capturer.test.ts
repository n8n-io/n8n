import type { StructuredChunk } from 'n8n-workflow';

import { createStructuredChunkAggregator } from '../stream-capturer';

describe('createStructuredChunkAggregator', () => {
	it('ignores workflow and telemetry chunks while aggregating item chunks', async () => {
		const onBegin = jest.fn();
		const onItem = jest.fn();
		const onEnd = jest.fn();
		const aggregator = createStructuredChunkAggregator('previous-message', null, {
			onBegin,
			onItem,
			onEnd,
		});
		const nodeMetadata = {
			nodeId: 'node-1',
			nodeName: 'Agent',
			nodeType: '@n8n/n8n-nodes-langchain.agent',
			runIndex: 0,
			timestamp: 1,
		};
		const itemMetadata = { ...nodeMetadata, itemIndex: 0 };

		await aggregator.ingest({ type: 'begin', metadata: { timestamp: 1 } });
		await aggregator.ingest({
			type: 'node-execute-before',
			metadata: nodeMetadata,
		});
		await aggregator.ingest({
			type: 'tool-call-start',
			metadata: { ...nodeMetadata, toolId: 'call-1', toolName: 'Search', toolType: 'tool_call' },
		});

		expect(onBegin).not.toHaveBeenCalled();

		await aggregator.ingest({ type: 'begin', metadata: itemMetadata });
		await aggregator.ingest({ type: 'item', content: 'Hello', metadata: itemMetadata });
		const message = await aggregator.ingest({
			type: 'end',
			metadata: itemMetadata,
		} satisfies StructuredChunk);

		expect(onBegin).toHaveBeenCalledTimes(1);
		expect(onItem).toHaveBeenCalledWith(expect.objectContaining({ content: 'Hello' }), 'Hello');
		expect(onEnd).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'Hello', status: 'success' }),
		);
		expect(message).toEqual(expect.objectContaining({ content: 'Hello', status: 'success' }));
	});
});
