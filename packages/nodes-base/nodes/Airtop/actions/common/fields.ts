import type { INodeProperties } from 'n8n-workflow';

export const SESSION_MODE = {
	NEW: 'new',
	EXISTING: 'existing',
} as const;

/**
 * Session related fields
 */

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
	description: 'The name of the Airtop profile to load or create',
	hint: '<a href="https://docs.airtop.ai/guides/how-to/saving-a-profile" target="_blank">Learn more</a> about Airtop profiles',
	placeholder: 'e.g. my-x-profile',
};

export const urlField: INodeProperties = {
	displayName: 'URL',
	name: 'url',
	type: 'string',
	default: '',
	placeholder: 'e.g. https://google.com',
	description: 'URL to load in the window',
};

/**
 * Extraction related fields
 */

export const outputSchemaField: INodeProperties = {
	displayName: 'JSON Output Schema',
	name: 'outputSchema',
	description: 'JSON schema defining the structure of the output',
	hint: 'If you want to force your output to be JSON, provide a valid JSON schema describing the output. You can generate one automatically in the <a href="https://portal.airtop.ai/" target="_blank">Airtop API Playground</a>.',
	type: 'json',
	default: '',
};

export const parseJsonOutputField: INodeProperties = {
	displayName: 'Parse JSON Output',
	name: 'parseJsonOutput',
	type: 'boolean',
	default: true,
	description:
		"Whether to parse the model's response to JSON in the output. Requires the 'JSON Output Schema' parameter to be set.",
};

/**
 * Interaction related fields
 */

export const elementDescriptionField: INodeProperties = {
	displayName: 'Element Description',
	name: 'elementDescription',
	type: 'string',
	default: '',
	description: 'A specific description of the element to execute the interaction on',
	placeholder: 'e.g. the search box at the top of the page',
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
					description: 'Automatically create a new session and window for this operation',
					value: SESSION_MODE.NEW,
				},
				{
					name: 'Use Existing Session',
					description: 'Use an existing session and window for this operation',
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
			description:
				'Whether to terminate the session after the operation is complete. When disabled, you must manually terminate the session. By default, idle sessions timeout after 10 minutes',
			displayOptions: {
				show: {
					resource: [resource],
					sessionMode: [SESSION_MODE.NEW],
				},
			},
		},
	];
}

export const includeHiddenElementsField: INodeProperties = {
	displayName: 'Include Hidden Elements',
	name: 'includeHiddenElements',
	type: 'boolean',
	default: true,
	description: 'Whether to include hidden elements in the interaction',
};
