import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class TheHiveApi implements ICredentialType {
	name = 'theHiveApi';
	displayName = 'The Hive Api';
	properties = [
		{
			displayName: 'API key',
			name: 'ApiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			default:'',
			name:'host',
			displayName:'TheHive Instance',
			required:true,
			type:"string" as NodePropertyTypes,
			description:"The URL of TheHive instance",
			placeholder:'https://localhost:9000'
		},
		{
			default:'',
			name:'apiVersion',
			displayName:'API Version',
			required:true,
			type:"options" as NodePropertyTypes,
			description:"The version of api to be used",
			options:[
				{
					name:'Api Version 1',
					value:'v1',
					description:'API version supported by TheHive 4'
				},
				{
					name:'Api Version 0',
					value:'',
					description:'API version supported by TheHive 3'
				},
			]
		},
	];
}
