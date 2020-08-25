import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class CortexApi implements ICredentialType {
	name = 'cortexApi';
	displayName = 'Cortex Api';
	properties = [
		{
			displayName: 'API key',
			name: 'cortexApiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			default:'',
			name:'host',
			displayName:'Cortex Instance',
			required:true,
			type:"string" as NodePropertyTypes,
			description:"The URL of the Cortex instance",
			placeholder:'https://localhost:9001'
		},
	];
}
