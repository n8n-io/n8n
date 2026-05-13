import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class DeviceConnectionApi implements ICredentialType {
	name = 'deviceConnectionApi';

	displayName = 'Device Connection';

	properties: INodeProperties[] = [
		{
			displayName: 'Device Name',
			name: 'deviceName',
			type: 'string',
			default: '',
			placeholder: "e.g. Bernhard's MacBook",
			description:
				'A friendly name to identify this device. When multiple devices are connected, this helps distinguish which one the workflow targets.',
		},
	];
}
