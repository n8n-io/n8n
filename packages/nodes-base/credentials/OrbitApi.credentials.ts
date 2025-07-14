import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class OrbitApi implements ICredentialType {
	name = 'orbitApi';

	displayName = 'Orbit API';

	documentationUrl = 'orbit';

	properties: INodeProperties[] = [
		{
			displayName:
				'Orbit has been shutdown and will no longer function from July 11th, You can read more <a target="_blank" href="https://orbit.love/blog/orbit-is-joining-postman">here</a>.',
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
