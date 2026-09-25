import type { IDataObject, INode, IPollFunctions, PollCursor } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { E2eTestPollingTrigger } from '../E2eTestPollingTrigger.node';

describe('E2eTestPollingTrigger', () => {
	const node: INode = {
		id: 'poll-node-id',
		name: 'E2E Test Polling Trigger',
		type: 'n8n-nodes-base.e2eTestPollingTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	let trigger: E2eTestPollingTrigger;
	let pollFunctions: Mocked<IPollFunctions>;
	let nodeStaticData: PollCursor;

	const givenCursor = (cursor: PollCursor | null) => {
		nodeStaticData = cursor ? { ...cursor } : {};
	};

	const givenResponse = (body: unknown) => {
		(pollFunctions.helpers.httpRequest as Mock).mockResolvedValue(body);
	};

	const emittedJson = (result: Awaited<ReturnType<E2eTestPollingTrigger['poll']>>) =>
		result?.[0].map((item) => item.json);

	beforeEach(() => {
		trigger = new E2eTestPollingTrigger();
		pollFunctions = mockDeep<IPollFunctions>();

		pollFunctions.getNode.mockReturnValue(node);
		pollFunctions.getNodeParameter.mockReturnValue('http://poll.test/items');
		(pollFunctions.helpers.returnJsonArray as Mock).mockImplementation((data: IDataObject[]) =>
			data.map((json, index) => ({ json, pairedItem: { item: index } })),
		);
		givenCursor(null);
		pollFunctions.getWorkflowStaticData.mockImplementation(() => nodeStaticData);
	});

	it('should emit every item and set the highest id on its first poll', async () => {
		givenResponse({ items: [{ id: 1 }, { id: 2 }] });

		const result = await trigger.poll.call(pollFunctions);

		expect(emittedJson(result)).toEqual([{ id: 1 }, { id: 2 }]);
		expect(nodeStaticData).toEqual({ lastItemId: 2 });
		expect(pollFunctions.getWorkflowStaticData).toHaveBeenCalledWith('node');
	});

	it('should never emit an item with a non-numeric or missing id, on a first poll', async () => {
		givenResponse({ items: [{ id: 1 }, { id: 'not-a-number' }, { foo: 'bar' }] });

		const result = await trigger.poll.call(pollFunctions);

		expect(emittedJson(result)).toEqual([{ id: 1 }]);
		expect(nodeStaticData).toEqual({ lastItemId: 1 });
	});

	it('should never emit an item with a non-numeric or missing id, on a later poll', async () => {
		givenCursor({ lastItemId: 2 });
		givenResponse({ items: [{ id: 3 }, { id: 'not-a-number' }, { foo: 'bar' }] });

		const result = await trigger.poll.call(pollFunctions);

		expect(emittedJson(result)).toEqual([{ id: 3 }]);
		expect(nodeStaticData).toEqual({ lastItemId: 3 });
	});

	it('should emit only the items above the cursor and advance it', async () => {
		givenCursor({ lastItemId: 2 });
		givenResponse({ items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] });

		const result = await trigger.poll.call(pollFunctions);

		expect(emittedJson(result)).toEqual([{ id: 3 }, { id: 4 }]);
		expect(nodeStaticData).toEqual({ lastItemId: 4 });
	});

	it('should emit nothing and hold the cursor when the endpoint repeats known items', async () => {
		givenCursor({ lastItemId: 2 });
		givenResponse({ items: [{ id: 1 }, { id: 2 }] });

		const result = await trigger.poll.call(pollFunctions);

		expect(result).toBeNull();
		expect(nodeStaticData).toEqual({ lastItemId: 2 });
	});

	it('should emit nothing and leave the cursor untouched when the endpoint returns no items', async () => {
		givenCursor({ lastItemId: 2 });
		givenResponse({ items: [] });

		const result = await trigger.poll.call(pollFunctions);

		expect(result).toBeNull();
		expect(nodeStaticData).toEqual({ lastItemId: 2 });
	});

	it('should treat an unusable cursor value as a first poll', async () => {
		givenCursor({ lastItemId: 'not-a-number' });
		givenResponse({ items: [{ id: 7 }] });

		const result = await trigger.poll.call(pollFunctions);

		expect(emittedJson(result)).toEqual([{ id: 7 }]);
		expect(nodeStaticData).toEqual({ lastItemId: 7 });
	});

	it('should raise a node operation error when the endpoint fails', async () => {
		(pollFunctions.helpers.httpRequest as Mock).mockRejectedValue(new Error('connection refused'));

		await expect(trigger.poll.call(pollFunctions)).rejects.toThrow(NodeOperationError);
		expect(nodeStaticData).toEqual({});
	});
});
