import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class EventLogApi implements ICredentialType {
	name = 'eventLogApi';

	displayName = 'Event Log API';

	icon: Icon = 'file:../nodes/EventLog/eventLog.svg';

	documentationUrl = 'https://example.com/n8n-nodes-event-log#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Events-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'http://127.0.0.1:18090/events/v1',
			url: '/events',
			qs: { occurred_after: '2026-03-27T00:00:00Z', limit: 1 },
		},
	};
}
