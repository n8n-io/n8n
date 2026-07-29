import type { IDataObject, IPollFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { E2eTestPollingTrigger } from '../E2eTestPollingTrigger.node';

describe('E2eTestPollingTrigger', () => {
	const node = new E2eTestPollingTrigger();

	/** A poll context whose fetch returns `items` and whose stored cursor is `cursor`. */
	const createPollFunctions = (
		items: IDataObject[],
		{ trackCursor = true, cursor }: { trackCursor?: boolean; cursor?: IDataObject } = {},
	) => {
		const staged: IDataObject[] = [];
		const pollFunctions = mock<IPollFunctions>({
			helpers: {
				httpRequest: vi.fn().mockResolvedValue({ items }),
				returnJsonArray: (data: IDataObject[]) => data.map((json) => ({ json })),
			},
		});
		pollFunctions.getNodeParameter.mockImplementation((name: string) =>
			name === 'url' ? 'http://poll.test/items' : trackCursor,
		);
		pollFunctions.getCursor.mockReturnValue(cursor);
		pollFunctions.setCursor.mockImplementation((value: IDataObject) => {
			staged.push(value);
		});

		return { pollFunctions, staged };
	};

	it('emits every item and stages nothing when cursor tracking is off', async () => {
		const { pollFunctions, staged } = createPollFunctions([{ id: 1 }, { id: 2 }], {
			trackCursor: false,
		});

		const result = await node.poll.call(pollFunctions);

		expect(result).toEqual([[{ json: { id: 1 } }, { json: { id: 2 } }]]);
		expect(staged).toEqual([]);
	});

	it('emits every item on a first poll and stages the last one as the cursor', async () => {
		const { pollFunctions, staged } = createPollFunctions([{ id: 1 }, { id: 2 }]);

		const result = await node.poll.call(pollFunctions);

		expect(result).toEqual([[{ json: { id: 1 } }, { json: { id: 2 } }]]);
		expect(staged).toEqual([{ lastItemId: '2', polls: 1 }]);
	});

	it('emits only the items after the stored cursor', async () => {
		const { pollFunctions, staged } = createPollFunctions([{ id: 1 }, { id: 2 }, { id: 3 }], {
			cursor: { lastItemId: '1', polls: 1 },
		});

		const result = await node.poll.call(pollFunctions);

		expect(result).toEqual([[{ json: { id: 2 } }, { json: { id: 3 } }]]);
		expect(staged).toEqual([{ lastItemId: '3', polls: 2 }]);
	});

	it('advances the poll count when the window holds nothing new', async () => {
		const { pollFunctions, staged } = createPollFunctions([{ id: 1 }], {
			cursor: { lastItemId: '1', polls: 1 },
		});

		const result = await node.poll.call(pollFunctions);

		expect(result).toBeNull();
		expect(staged).toEqual([{ lastItemId: '1', polls: 2 }]);
	});

	it('emits everything again when the stored cursor names an item the window no longer holds', async () => {
		const { pollFunctions, staged } = createPollFunctions([{ id: 4 }, { id: 5 }], {
			cursor: { lastItemId: '1', polls: 1 },
		});

		const result = await node.poll.call(pollFunctions);

		expect(result).toEqual([[{ json: { id: 4 } }, { json: { id: 5 } }]]);
		expect(staged).toEqual([{ lastItemId: '5', polls: 2 }]);
	});
});
