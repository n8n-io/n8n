import type { INodeProperties } from 'n8n-workflow';
import { API_VERSION } from '../../helpers/constants';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'upsert',
		displayOptions: {
			show: {
				resource: ['recordSet'],
			},
		},
		options: [
			{
				name: 'Upsert',
				value: 'upsert',
				description: 'Create or update a record set',
				action: 'Upsert a record set',
				routing: {
					request: {
						method: 'POST',
						url: `=/${API_VERSION}/hostedzone/{{ $parameter["hostedZoneId"] }}/rrset`,
						headers: {
							'Content-Type': 'application/xml',
						},
						body: '={{ "<ChangeResourceRecordSetsRequest xmlns=\\"https://route53.amazonaws.com/doc/2013-04-01/\\"><ChangeBatch><Changes><Change><Action>UPSERT</Action><ResourceRecordSet><Name>" + $parameter["recordName"] + "</Name><Type>" + $parameter["recordType"] + "</Type><TTL>" + $parameter["ttl"] + "</TTL><ResourceRecords>" + JSON.parse($parameter["recordValues"]).map(v => "<ResourceRecord><Value>" + v + "</Value></ResourceRecord>").join("") + "</ResourceRecords></ResourceRecordSet></Change></Changes></ChangeBatch></ChangeResourceRecordSetsRequest>" }}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a record set',
				action: 'Delete a record set',
				routing: {
					request: {
						method: 'POST',
						url: `=/${API_VERSION}/hostedzone/{{ $parameter["hostedZoneId"] }}/rrset`,
						headers: {
							'Content-Type': 'application/xml',
						},
						body: '={{ "<ChangeResourceRecordSetsRequest xmlns=\\"https://route53.amazonaws.com/doc/2013-04-01/\\"><ChangeBatch><Changes><Change><Action>DELETE</Action><ResourceRecordSet><Name>" + $parameter["recordName"] + "</Name><Type>" + $parameter["recordType"] + "</Type><TTL>" + $parameter["ttl"] + "</TTL><ResourceRecords>" + JSON.parse($parameter["recordValues"]).map(v => "<ResourceRecord><Value>" + v + "</Value></ResourceRecord>").join("") + "</ResourceRecords></ResourceRecordSet></Change></Changes></ChangeBatch></ChangeResourceRecordSetsRequest>" }}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List record sets',
				action: 'List record sets',
				routing: {
					request: {
						method: 'GET',
						url: `=/${API_VERSION}/hostedzone/{{ $parameter["hostedZoneId"] }}/rrset`,
						qs: {
							maxitems: '={{ $parameter["maxItems"] }}',
							name: '={{ $parameter["startRecordName"] }}',
							type: '={{ $parameter["startRecordType"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
		],
	},
	// Common fields
	{
		displayName: 'Hosted Zone ID',
		name: 'hostedZoneId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['recordSet'],
			},
		},
		default: '',
		description: 'The ID of the hosted zone',
	},
	// Upsert/Delete operation fields
	{
		displayName: 'Record Name',
		name: 'recordName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['recordSet'],
				operation: ['upsert', 'delete'],
			},
		},
		default: '',
		description: 'The name of the record (e.g., www.example.com)',
	},
	{
		displayName: 'Record Type',
		name: 'recordType',
		type: 'options',
		options: [
			{ name: 'A', value: 'A' },
			{ name: 'AAAA', value: 'AAAA' },
			{ name: 'CNAME', value: 'CNAME' },
			{ name: 'MX', value: 'MX' },
			{ name: 'TXT', value: 'TXT' },
			{ name: 'NS', value: 'NS' },
			{ name: 'SOA', value: 'SOA' },
			{ name: 'SRV', value: 'SRV' },
			{ name: 'PTR', value: 'PTR' },
			{ name: 'CAA', value: 'CAA' },
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['recordSet'],
				operation: ['upsert', 'delete'],
			},
		},
		default: 'A',
		description: 'The DNS record type',
	},
	{
		displayName: 'TTL',
		name: 'ttl',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['recordSet'],
				operation: ['upsert', 'delete'],
			},
		},
		default: 300,
		description: 'Time to live in seconds',
	},
	{
		displayName: 'Record Values',
		name: 'recordValues',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['recordSet'],
				operation: ['upsert', 'delete'],
			},
		},
		default: '["192.0.2.1"]',
		description: 'Array of record values',
	},
	// List operation fields
	{
		displayName: 'Max Items',
		name: 'maxItems',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['recordSet'],
				operation: ['list'],
			},
		},
		default: 100,
		description: 'Maximum number of record sets to return',
	},
	{
		displayName: 'Start Record Name',
		name: 'startRecordName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['recordSet'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Name to start listing from',
	},
	{
		displayName: 'Start Record Type',
		name: 'startRecordType',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['recordSet'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Type to start listing from',
	},
];
