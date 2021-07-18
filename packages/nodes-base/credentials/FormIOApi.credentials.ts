import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class FormIOApi implements ICredentialType {
	name = 'formIOApi';
	displayName = 'FormIO API';
	properties = [
		{
			displayName: 'Form.io Username',
			name: 'formIOUsername',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Form.io Password',
			name: 'formIOPassword',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Form.io EndPoint',
			name: 'formIOEndpoint',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}