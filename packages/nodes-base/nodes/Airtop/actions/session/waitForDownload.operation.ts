import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { DEFAULT_DOWNLOAD_TIMEOUT_SECONDS } from '../../constants';
import { validateSessionId, waitForSessionEvent } from '../../GenericFunctions';
import { sessionIdField } from '../common/fields';

const displayOptions = {
	show: {
		resource: ['session'],
		operation: ['waitForDownload'],
	},
};

export const description: INodeProperties[] = [
	{
		...sessionIdField,
		displayOptions,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions,
		options: [
			{
				displayName: 'Timeout',
				description: 'Time in seconds to wait for the download to become available',
				name: 'timeout',
				type: 'number',
				default: DEFAULT_DOWNLOAD_TIMEOUT_SECONDS,
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const sessionId = validateSessionId.call(this, index);
	const timeout = this.getNodeParameter(
		'timeout',
		index,
		DEFAULT_DOWNLOAD_TIMEOUT_SECONDS,
	) as number;

	// Wait for a file_status event with status 'available'
	const event = await waitForSessionEvent.call(
		this,
		sessionId,
		(sessionEvent) => sessionEvent.event === 'file_status' && sessionEvent.status === 'available',
		timeout,
	);

	// Extract fileId and downloadUrl from the event
	const result: IDataObject = {
		fileId: event.fileId,
		downloadUrl: event.downloadUrl,
	};

	return this.helpers.returnJsonArray({
		sessionId,
		data: result,
	});
}
