import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class OrbitApi implements ICredentialType {
	name = 'orbitApi';
	displayName = 'Orbit API';
	documentationUrl = 'orbit';
	properties = [
		{
			displayName: 'API Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
