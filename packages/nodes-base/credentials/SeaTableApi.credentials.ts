import tzData from 'moment-timezone/data/packed/latest.json';
import type {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

// Credential classes are loaded eagerly at server boot, so build the timezone
// options from moment-timezone's packed data ("CC|Zone Zone…" entries) instead
// of loading the whole library. Matches moment.tz.countries()/zonesForCountry().
const timezones: INodePropertyOptions[] = tzData.countries.flatMap((entry) => {
	const [, zones] = entry.split('|');
	return zones
		.split(' ')
		.sort()
		.map((zone) => ({ value: zone, name: zone }));
});

export class SeaTableApi implements ICredentialType {
	name = 'seaTableApi';

	displayName = 'SeaTable API';

	documentationUrl = 'seatable';

	properties: INodeProperties[] = [
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			default: 'cloudHosted',
			options: [
				{
					name: 'Cloud-Hosted',
					value: 'cloudHosted',
				},
				{
					name: 'Self-Hosted',
					value: 'selfHosted',
				},
			],
		},
		{
			displayName: 'Self-Hosted Domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'https://seatable.example.com',
			displayOptions: {
				show: {
					environment: ['selfHosted'],
				},
			},
		},
		{
			displayName: 'API Token (of a Base)',
			name: 'token',
			type: 'string',
			description:
				'The API-Token of the SeaTable base you would like to use with n8n. n8n can only connect to one base at a time.',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Timezone',
			name: 'timezone',
			type: 'options',
			default: '',
			description: "Seatable server's timezone",
			options: [...timezones],
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.domain || "https://cloud.seatable.io" }}',
			url: '/api/v2.1/dtable/app-access-token/',
			headers: {
				Authorization: '={{"Token " + $credentials.token}}',
			},
		},
	};
}
