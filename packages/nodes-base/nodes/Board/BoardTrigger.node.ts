import type {
	BoardStatusChangedEvent,
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { BOARD_ID_FIELD, BOARD_RESOURCE_LOCATOR_BASE } from './common/fields';
import { boardSearch, getBoardStatuses } from './common/methods';
import { resolveBoardId } from './common/utils';

export class BoardTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Board Trigger',
		name: 'boardTrigger',
		icon: 'file:board.svg',
		group: ['trigger'],
		version: [1],
		description: 'Triggers a workflow when a board item enters a specific status',
		subtitle: '={{$parameter["status"] ? "Status: " + $parameter["status"] : ""}}',
		defaults: {
			name: 'Board Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				...BOARD_RESOURCE_LOCATOR_BASE,
				description: 'The board to watch for status changes',
			},
			{
				displayName: 'Status Name or ID',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getBoardStatuses',
					loadOptionsDependsOn: [`${BOARD_ID_FIELD}.value`],
				},
				default: '',
				required: true,
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
		],
	};

	methods = {
		listSearch: {
			boardSearch,
		},
		loadOptions: {
			getBoardStatuses,
		},
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const emitter = this.helpers.getBoardEventEmitter?.();
		if (!emitter) {
			throw new NodeOperationError(
				this.getNode(),
				'Board event system is not available. The data-table module may be disabled.',
			);
		}

		const resourceLocator = this.getNodeParameter(BOARD_ID_FIELD) as {
			mode: 'list' | 'id' | 'name';
			value: string;
		};

		if (!resourceLocator?.value) {
			throw new NodeOperationError(this.getNode(), 'No board selected');
		}

		const boardId = await resolveBoardId(this, resourceLocator);
		const status = this.getNodeParameter('status') as string;

		const unsubscribe = emitter.onStatusChanged(
			boardId,
			status,
			(event: BoardStatusChangedEvent) => {
				this.emit([this.helpers.returnJsonArray(event.items)]);
			},
		);

		const MANUAL_TIMEOUT_MS = 60_000;

		const manualTriggerFunction = async () =>
			await new Promise<void>((resolve) => {
				const manualUnsubscribe = emitter.onStatusChanged(
					boardId,
					status,
					(event: BoardStatusChangedEvent) => {
						this.emit([this.helpers.returnJsonArray(event.items)]);
						manualUnsubscribe();
						clearTimeout(timeout);
						resolve();
					},
				);

				const timeout = setTimeout(() => {
					manualUnsubscribe();
					resolve();
				}, MANUAL_TIMEOUT_MS);
			});

		return {
			async closeFunction() {
				await Promise.resolve();
				unsubscribe();
			},
			manualTriggerFunction,
		};
	}
}
