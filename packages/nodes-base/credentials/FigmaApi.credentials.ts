import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class FigmaApi implements ICredentialType {
	name = 'figmaApi';

	displayName = 'Figma API';

	documentationUrl = 'figma';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
