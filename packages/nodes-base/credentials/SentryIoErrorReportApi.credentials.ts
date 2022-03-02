import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class SentryIoErrorReportApi implements ICredentialType {
	name = 'sentryErrorApi';
	displayName = 'Sentry Error Report API';
	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Project ID',
			name: 'project_id',
			type: 'number',
			default: 0,
			required: true,
		},
		{
			displayName: 'Sentry Key',
			name: 'sentry_key',
			type: 'string',
			default: '',
			required: true,
		},
	];
}
