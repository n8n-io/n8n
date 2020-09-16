import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class Msg91Api implements ICredentialType {
	name = 'msg91Api';
	displayName = 'Msg91 Api';
	documentationUrl = 'msg91';
	properties = [
		// User authentication key
		{
			displayName: 'Authentication Key',
			name: 'authkey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
