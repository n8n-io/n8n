import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class ReadPdf implements ICredentialType {
	name = 'readPDF';
	displayName = 'Read PDF';
	documentationUrl = 'readPDF';
	properties = [
		{
			displayName: 'Password',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true,
			},
			default: '',
		}
	];
}