import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class VideoAskApi implements ICredentialType {
	name = 'videoAskApi';
	displayName = 'VideoAsk API';
	documentationUrl = 'videoAsk';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
			required: true,
		}
	];
}
