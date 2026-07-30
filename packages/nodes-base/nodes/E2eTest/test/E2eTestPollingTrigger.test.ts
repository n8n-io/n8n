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

	const givenCursor = (cursor: PollCursor | null) => {
		pollFunctions.getCursor.mockResolvedValue(cursor);
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
	});

	it('should emit every item and stage the highest id on its first poll', async () => {
		givenResponse({ items: [{ id: 1 }, { id: 2 }] });

		const result = await trigger.poll.call(pollFunctions);

		expect(emittedJson(result)).toEqual([{ id: 1 }, { id: 2 }]);
		expect(pollFunctions.setCursor).toHaveBeenCalledWith({ lastItemId: 2 });
	});

	it('should emit only the items above the cursor and advance it', async () => {
		givenCursor({ lastItemId: 2 });
		givenResponse({ items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] });

		const result = await trigger.poll.call(pollFunctions);

		expect(emittedJson(result)).toEqual([{ id: 3 }, { id: 4 }]);
		expect(pollFunctions.setCursor).toHaveBeenCalledWith({ lastItemId: 4 });
	});

	it('should emit nothing and hold the cursor when the endpoint repeats known items', async () => {
		givenCursor({ lastItemId: 2 });
		givenResponse({ items: [{ id: 1 }, { id: 2 }] });

		const result = await trigger.poll.call(pollFunctions);

		expect(result).toBeNull();
		expect(pollFunctions.setCursor).toHaveBeenCalledWith({ lastItemId: 2 });
	});

	it('should emit nothing and leave the cursor untouched when the endpoint returns no items', async () => {
		givenCursor({ lastItemId: 2 });
		givenResponse({ items: [] });

		const result = await trigger.poll.call(pollFunctions);

		expect(result).toBeNull();
		expect(pollFunctions.setCursor).not.toHaveBeenCalled();
	});

	it('should treat an unusable cursor value as a first poll', async () => {
		givenCursor({ lastItemId: 'not-a-number' });
		givenResponse({ items: [{ id: 7 }] });

		const result = await trigger.poll.call(pollFunctions);

		expect(emittedJson(result)).toEqual([{ id: 7 }]);
		expect(pollFunctions.setCursor).toHaveBeenCalledWith({ lastItemId: 7 });
	});

	it('should raise a node operation error when the endpoint fails', async () => {
		(pollFunctions.helpers.httpRequest as Mock).mockRejectedValue(new Error('connection refused'));

		await expect(trigger.poll.call(pollFunctions)).rejects.toThrow(NodeOperationError);
		expect(pollFunctions.setCursor).not.toHaveBeenCalled();
	});
});
