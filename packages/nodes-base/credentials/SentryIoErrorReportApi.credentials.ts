import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class SentryIoErrorReportApi implements ICredentialType {
	name = 'sentryErrorApi';
	displayName = 'Sentry Error Report API';
	properties: INodeProperties[] = [
		{
			displayName: 'Sentry Key',
			name: 'sentry_key',
			type: 'string',
			default: '',
			required: true,
		},
	];
}
