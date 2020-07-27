import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class TwakeCloudApi implements ICredentialType {
	name = 'twakeCloudApi';
	displayName = 'Twake API';
	properties = [
		{
			displayName: 'Standar Plan',
			name: 'standarPlan',
			type: 'boolean' as NodePropertyTypes,
			default: true,
		},
		{
			displayName: 'Workspace Key',
			name: 'workspaceKey',
			displayOptions: {
				show: {
					standarPlan: [
						true,
					],
				},
			},
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Public ID',
			name: 'publicId',
			displayOptions: {
				show: {
					standarPlan: [
						false,
					],
				},
			},
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Private API Key',
			name: 'privateApiKey',
			displayOptions: {
				show: {
					standarPlan: [
						false,
					],
				},
			},
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
