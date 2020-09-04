import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class LinkFishApi implements ICredentialType {
	name = 'linkFishApi';
	displayName = 'link.fish API';
	documentationUrl = 'linkFish';
	properties = [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string' as NodePropertyTypes,
			default: '',

		},
		{
			displayName: 'Api Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
