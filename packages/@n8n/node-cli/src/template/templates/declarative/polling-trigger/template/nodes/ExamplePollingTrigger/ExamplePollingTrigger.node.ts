import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

// A declarative polling trigger (preview). n8n builds `poll()` from `description.trigger`.
// n8n also sets `polling: true` and adds the Poll Times parameter. Do not add them yourself.
// This example uses a placeholder API that returns `{ "data": [...] }` from
// `GET /projects/{projectId}/tasks` and accepts an `updated_since` query parameter.
export class ExamplePollingTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Example Polling Trigger',
		name: 'examplePollingTrigger',
		icon: { light: 'file:../../icons/example.svg', dark: 'file:../../icons/example.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{"Project " + $parameter["projectId"]}}',
		description: 'Starts the workflow when a task changes in the Example API',
		defaults: {
			name: 'Example Polling Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'exampleApi', required: true }],
		requestDefaults: {
			baseURL: 'https://api.example.com/v1',
			headers: {
				Accept: 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: '',
				required: true,
				description: 'The ID of the project to watch',
			},
		],
		trigger: {
			type: 'polling',
			routing: {
				request: {
					method: 'GET',
					url: '=/projects/{{$parameter["projectId"]}}/tasks',
					// `$cursor.value` is the latest `updated_at` of the last poll.
					// It is undefined in a manual run, so n8n does not send the parameter.
					qs: { updated_since: '={{$cursor.value}}' },
				},
				// This example reads only the first page. If the API sends the newest items first,
				// the items on later pages are lost. For a real API, add `operations.pagination`.
				output: {
					// Make one item from each element of `data`.
					postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }],
				},
			},
			// An item is new when its `updated_at` is later than the stored cursor. The same time is not later.
			// For APIs with increasing IDs, use `{ type: 'id', field: 'id' }` and send the ID in `qs`.
			// An ID cursor finds new items, but not changed items.
			cursor: { type: 'timestamp', field: 'updated_at' },
			// A manual run returns the last 5 items of the response and does not store a cursor.
			manual: { maxResults: 5 },
		},
	};
}
