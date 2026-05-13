import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class DeviceConnectionApi implements ICredentialType {
	name = 'deviceConnectionApi';

	displayName = 'Device Connection';

	icon: Icon = 'node:@n8n/n8n-nodes-langchain.computerUse';

	properties: INodeProperties[] = [
		{
			displayName: 'Device Owner ID',
			name: 'deviceOwnerId',
			type: 'hidden',
			default: '',
			description:
				'The user ID of the device owner. Auto-populated on creation. Used to route tool calls to the correct device when the credential is shared.',
		},
		{
			displayName: 'Device Name',
			name: 'deviceName',
			type: 'string',
			default: '',
			placeholder: "e.g. Bernhard's MacBook",
			description:
				'Auto-detected from the connected device. Change to give this device a custom name.',
		},
	];
}
