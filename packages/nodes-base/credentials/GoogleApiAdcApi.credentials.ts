import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

import { getGoogleRegionOptions } from './common/google/regions';

export class GoogleApiAdcApi implements ICredentialType {
	name = 'googleApiAdcApi';

	displayName = 'Google Application Default Credentials (ADC)';

	documentationUrl = 'google/service-account';

	icon: Icon = 'file:icons/Google.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Region',
			name: 'region',
			type: 'options',
			options: getGoogleRegionOptions(),
			default: 'us-central1',
			description:
				'The region where the Google Cloud service is located. This applies only to specific nodes, like the Google Vertex Chat Model',
		},
		{
			displayName: 'Project ID',
			name: 'projectId',
			type: 'string',
			default: '',
			description:
				'The Google Cloud Project ID. If left empty, it will be auto-detected from the ADC configuration or environment.',
		},
		{
			displayName: 'Application Default Credentials Setup',
			name: 'adcNotice',
			type: 'notice',
			default: '',
			description:
				'This credential type uses Google Application Default Credentials (ADC). Make sure you have run "gcloud auth application-default login" or have set the GOOGLE_APPLICATION_CREDENTIALS environment variable. <a href="https://cloud.google.com/docs/authentication/provide-credentials-adc" target="_blank">Learn more</a>.',
		},
	];
}
