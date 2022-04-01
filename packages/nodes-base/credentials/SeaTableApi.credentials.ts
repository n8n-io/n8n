import {
	ICredentialType,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

import * as moment from 'moment-timezone';

// Get options for timezones
const timezones: INodePropertyOptions[] = moment.tz.countries().reduce( (timezones: INodePropertyOptions[], country: string) => {
	const zonesForCountry = moment.tz.zonesForCountry(country).map(zone => ({value: zone, name: zone}));
	return timezones.concat(zonesForCountry);
}, []);

export class SeaTableApi implements ICredentialType {
	name = 'seaTableApi';
	displayName = 'SeaTable API';
	documentationUrl = 'seaTable';
	properties: INodeProperties[] = [
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			default: 'cloudHosted',
			options: [
				{
					name: 'Cloud-hosted',
					value: 'cloudHosted',
				},
				{
					name: 'Self-hosted',
					value: 'selfHosted',
				},
			],
		},
		{
			displayName: 'Self-hosted domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'https://www.mydomain.com',
			displayOptions: {
				show: {
					environment: [
						'selfHosted',
					],
				},
			},
		},
		{
			displayName: 'API Token (of a Base)',
			name: 'token',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Timezone',
			name: 'timezone',
			type: 'options',
			default: 'Europe/Berlin',
			description: `Seatable server's timezone`,
			options: [
				...timezones,
			],
		},
	];
}
