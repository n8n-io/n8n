import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class Serverchan implements ICredentialType {
	name = 'serverchan';
	displayName = 'ServerChan';
	documentationUrl = 'serverchan';
	properties = [
			{
					displayName: 'Send Key',
					name: 'sendKey',
					type: 'string' as NodePropertyTypes,
					default: '',
			},
	];
}
