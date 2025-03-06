import type { INodeProperties, NodeHint } from 'n8n-workflow';

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
	description:
		'The name of the <a href="https://docs.airtop.ai/guides/how-to/saving-a-profile" target="_blank">Profile</a> to load or create',
	hint: 'Name of the <a href="https://docs.airtop.ai/guides/how-to/saving-a-profile" target="_blank">Profile</a> to load into the session. Must consist only of alphanumeric characters and hyphen "-"',
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

/**
 * Interaction related fields
 */

export const elementDescriptionField: INodeProperties = {
	displayName: 'Element Description',
	name: 'elementDescription',
	type: 'string',
	default: '',
	description: 'The description of the element to execute the interaction on',
	hint: 'Describe the element, e.g. "the search box at the top of the page", "the username field", "the password field". Be as descriptive as possible.',
};

export function getSessionModeFields(resource: string, operations: string[]): INodeProperties[] {
	return [
		{
			displayName: 'Session Mode',
			name: 'sessionMode',
			type: 'options',
			default: 'existing',
			description: 'Choose between creating a new session or using an existing one',
			hint: "Manually creating a session requires that you use the 'Create a session' and 'Create a window' operations before this operation. This provides you with more advanced configuration options, but is slightly more verbose to use.",
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
			hint: `Name of the profile to load into the session.
				Must consist only of alphanumeric characters and hyphens "-".
				You can create a profile <a href="https://portal.airtop.ai/browser-profiles" target="_blank" >here</a>.
				Note, in order to save data into a profile, you must first call the 'Save Profile on Termination' operation before you terminate the session.`,
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
