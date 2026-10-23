import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class OrbitApi implements ICredentialType {
	name = 'orbitApi';

	displayName = 'Orbit API';

	documentationUrl = 'orbit';

	properties: INodeProperties[] = [
		{
			displayName:
				'Orbit has been shutdown and will no longer function from July 11th, You can read more <a target="_blank" href="https://blog.postman.com/announcing-postman-has-acquired-orbit/">here</a>.',
			name: 'deprecated',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'API Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
