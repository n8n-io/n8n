import type { INodeProperties, NodeHint } from 'n8n-workflow';

export const SESSION_MODE = {
	NEW: 'new',
	EXISTING: 'existing',
} as const;

export const sessionIdField: INodeProperties = {
	displayName: 'Session ID',
	name: 'sessionId',
	type: 'string',
	required: true,
	default: '={{ $json["sessionId"] }}',
	description:
		'The ID of the <a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank">Session</a> to use',
};

export const windowIdField: INodeProperties = {
	displayName: 'Window ID',
	name: 'windowId',
	type: 'string',
	required: true,
	default: '={{ $json["windowId"] }}',
	description:
		'The ID of the <a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank">Window</a> to use',
};

export const profileNameField: INodeProperties = {
	displayName: 'Profile Name',
	name: 'profileName',
	type: 'string',
	default: '',
	description:
		'The name of the <a href="https://docs.airtop.ai/guides/how-to/saving-a-profile" target="_blank">Profile</a> to load or create',
};

export const urlField: INodeProperties = {
	displayName: 'URL',
	name: 'url',
	type: 'string',
	default: '',
	placeholder: 'https://google.com',
	description: 'URL to load in the window',
};

export const autoTerminateSessionHint: NodeHint = {
	displayCondition:
		'={{ $parameter["sessionMode"] === "new" && $parameter["autoTerminateSession"] === false }}',
	message:
		"When 'Auto-Terminate Session' is disabled, you must manually terminate sessions. By default, idle sessions timeout after 10 minutes",
	type: 'warning',
	location: 'outputPane',
	whenToDisplay: 'beforeExecution',
};

export function getSessionModeFields(resource: string, operations: string[]): INodeProperties[] {
	return [
		{
			displayName: 'Session Mode',
			name: 'sessionMode',
			type: 'options',
			default: 'existing',
			description: 'Choose between creating a new session or using an existing one',
			options: [
				{
					name: 'Automatically Create Session',
					value: SESSION_MODE.NEW,
				},
				{
					name: 'Use Existing Session',
					value: SESSION_MODE.EXISTING,
				},
			],
			displayOptions: {
				show: {
					resource: [resource],
					operation: operations,
				},
			},
		},
		{
			...sessionIdField,
			displayOptions: {
				show: {
					resource: [resource],
					sessionMode: [SESSION_MODE.EXISTING],
				},
			},
		},
		{
			...windowIdField,
			displayOptions: {
				show: {
					resource: [resource],
					sessionMode: [SESSION_MODE.EXISTING],
				},
			},
		},
		{
			...urlField,
			required: true,
			displayOptions: {
				show: {
					resource: [resource],
					sessionMode: [SESSION_MODE.NEW],
				},
			},
		},
		{
			...profileNameField,
			displayOptions: {
				show: {
					resource: [resource],
					sessionMode: [SESSION_MODE.NEW],
				},
			},
		},
		{
			displayName: 'Auto-Terminate Session',
			name: 'autoTerminateSession',
			type: 'boolean',
			default: true,
			description: 'Whether to terminate the session after the operation is complete',
			displayOptions: {
				show: {
					resource: [resource],
					sessionMode: [SESSION_MODE.NEW],
				},
			},
		},
	];
}
