import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
} from 'n8n-workflow';

interface PollResponseBody {
	items?: IDataObject[];
}

interface PollCursor extends IDataObject {
	lastItemId: string;
	polls: number;
}

/** An item's id as a string, or `undefined` when it carries none a cursor can hold. */
function itemId(item: IDataObject | undefined): string | undefined {
	const id = item?.id;
	return typeof id === 'string' || typeof id === 'number' ? String(id) : undefined;
}

export class E2eTestPollingTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'E2E Test Polling Trigger',
		name: 'e2eTestPollingTrigger',
		icon: 'fa:play',
		group: ['trigger'],
		version: 1,
		description: 'Dummy polling trigger for e2e testing',
		subtitle: '={{$parameter["url"]}}',
		defaults: {
			name: 'E2E Test Polling Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				description: 'GET endpoint to poll. Expected to return JSON of shape { "items": [...] }.',
			},
			{
				displayName: 'Track Cursor',
				name: 'trackCursor',
				type: 'boolean',
				default: false,
				description:
					'Whether to remember the last item returned and emit only the items after it. Requires durable poll cursors; with them off no cursor is ever read back and every item is emitted on every poll.',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const url = this.getNodeParameter('url') as string;
		const trackCursor = this.getNodeParameter('trackCursor', false) as boolean;

		let body: PollResponseBody;
		try {
			body = (await this.helpers.httpRequest({
				method: 'GET',
				url,
				json: true,
			})) as PollResponseBody;
		} catch (error) {
			throw new NodeOperationError(this.getNode(), error as Error);
		}

		const items = body.items ?? [];
		if (!trackCursor) {
			return items.length ? [this.helpers.returnJsonArray(items)] : null;
		}

		const cursor = this.getCursor<PollCursor>();
		const lastIndex =
			cursor === undefined ? -1 : items.findIndex((item) => itemId(item) === cursor.lastItemId);
		const newItems = lastIndex === -1 ? items : items.slice(lastIndex + 1);

		// Staged even when the window came back empty, so the poll count advances on
		// every poll and a caller can tell "never polled" from "polled, found nothing".
		this.setCursor<PollCursor>({
			lastItemId: itemId(newItems.at(-1)) ?? cursor?.lastItemId ?? '',
			polls: (cursor?.polls ?? 0) + 1,
		});

		return newItems.length ? [this.helpers.returnJsonArray(newItems)] : null;
	}
}
