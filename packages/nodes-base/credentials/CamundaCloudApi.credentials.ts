import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

export class CamundaCloudApi implements ICredentialType {
	name = 'camundaCloudApi';
	displayName = 'Camunda Cloud API';
	documentationUrl = 'camundaCloud';
	properties = [
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string' as NodePropertyTypes,
			default: ''
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string' as NodePropertyTypes,
			default: ''
		},
		{
			displayName: 'Cluster ID',
			name: 'clusterId',
			type: 'string' as NodePropertyTypes,
			default: ''
		},
		{
			displayName: 'Cluster Region',
			name: 'clusterRegion',
			type: 'string' as NodePropertyTypes,
			default: 'bru-2'
		}
	];
}
