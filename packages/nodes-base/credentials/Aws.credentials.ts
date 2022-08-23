import { Request, sign } from 'aws4';
import { ICredentialTestRequest, IHttpRequestMethods } from 'n8n-workflow';
import {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IDataObject,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export const regions = [
	{
		name: 'af-south-1',
		displayName: 'Africa',
		location: 'Cape Town',
	},
	{
		name: 'ap-east-1',
		displayName: 'Asia Pacific',
		location: 'Hong Kong',
	},
	{
		name: 'ap-south-1',
		displayName: 'Asia Pacific',
		location: 'Mumbai',
	},
	{
		name: 'ap-southeast-1',
		displayName: 'Asia Pacific',
		location: 'Singapore',
	},
	{
		name: 'ap-southeast-2',
		displayName: 'Asia Pacific',
		location: 'Sydney',
	},
	{
		name: 'ap-southeast-3',
		displayName: 'Asia Pacific',
		location: 'Jakarta',
	},
	{
		name: 'ap-northeast-1',
		displayName: 'Asia Pacific',
		location: 'Tokyo',
	},
	{
		name: 'ap-northeast-2',
		displayName: 'Asia Pacific',
		location: 'Seoul',
	},
	{
		name: 'ap-northeast-3',
		displayName: 'Asia Pacific',
		location: 'Osaka',
	},
	{
		name: 'ca-central-1',
		displayName: 'Canada',
		location: 'Central',
	},
	{
		name: 'eu-central-1',
		displayName: 'Europe',
		location: 'Frankfurt',
	},
	{
		name: 'eu-north-1',
		displayName: 'Europe',
		location: 'Stockholm',
	},
	{
		name: 'eu-south-1',
		displayName: 'Europe',
		location: 'Milan',
	},
	{
		name: 'eu-west-1',
		displayName: 'Europe',
		location: 'Ireland',
	},
	{
		name: 'eu-west-2',
		displayName: 'Europe',
		location: 'London',
	},
	{
		name: 'eu-west-3',
		displayName: 'Europe',
		location: 'Paris',
	},
	{
		name: 'me-south-1',
		displayName: 'Middle East',
		location: 'Bahrain',
	},
	{
		name: 'sa-east-1',
		displayName: 'South America',
		location: 'São Paulo',
	},
	{
		name: 'us-east-1',
		displayName: 'US East',
		location: 'N. Virginia',
	},
	{
		name: 'us-east-2',
		displayName: 'US East',
		location: 'Ohio',
	},
	{
		name: 'us-west-1',
		displayName: 'US West',
		location: 'N. California',
	},
	{
		name: 'us-west-2',
		displayName: 'US West',
		location: 'Oregon',
	},
] as const;

export type AWSRegion = typeof regions[number]['name'];

export class Aws implements ICredentialType {
	name = 'aws';
	displayName = 'AWS';
	documentationUrl = 'aws';
	icon = 'file:AWS.svg';
	properties: INodeProperties[] = [
		{
			displayName: 'Region',
			name: 'region',
			type: 'options',
			options: regions.map((r) => ({
				name: `${r.displayName} (${r.location}) - ${r.name}`,
				value: r.name,
			})),
			default: 'us-east-1',
		},
		{
			displayName: 'Access Key ID',
			name: 'accessKeyId',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Secret Access Key',
			name: 'secretAccessKey',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
		},
		{
			displayName: 'Temporary Security Credentials',
			name: 'temporaryCredentials',
			// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
			description: 'Support for temporary credentials from AWS STS',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'string',
			displayOptions: {
				show: {
					temporaryCredentials: [true],
				},
			},
			default: '',
			typeOptions: {
				password: true,
			},
		},
		{
			displayName: 'Custom Endpoints',
			name: 'customEndpoints',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Rekognition Endpoint',
			name: 'rekognitionEndpoint',
			description:
				'If you use Amazon VPC to host n8n, you can establish a connection between your VPC and Rekognition using a VPC endpoint. Leave blank to use the default endpoint.',
			type: 'string',
			displayOptions: {
				show: {
					customEndpoints: [true],
				},
			},
			default: '',
			placeholder: 'https://rekognition.{region}.amazonaws.com',
		},
		{
			displayName: 'Lambda Endpoint',
			name: 'lambdaEndpoint',
			description:
				'If you use Amazon VPC to host n8n, you can establish a connection between your VPC and Lambda using a VPC endpoint. Leave blank to use the default endpoint.',
			type: 'string',
			displayOptions: {
				show: {
					customEndpoints: [true],
				},
			},
			default: '',
			placeholder: 'https://lambda.{region}.amazonaws.com',
		},
		{
			displayName: 'SNS Endpoint',
			name: 'snsEndpoint',
			description:
				'If you use Amazon VPC to host n8n, you can establish a connection between your VPC and SNS using a VPC endpoint. Leave blank to use the default endpoint.',
			type: 'string',
			displayOptions: {
				show: {
					customEndpoints: [true],
				},
			},
			default: '',
			placeholder: 'https://sns.{region}.amazonaws.com',
		},
		{
			displayName: 'SES Endpoint',
			name: 'sesEndpoint',
			description:
				'If you use Amazon VPC to host n8n, you can establish a connection between your VPC and SES using a VPC endpoint. Leave blank to use the default endpoint.',
			type: 'string',
			displayOptions: {
				show: {
					customEndpoints: [true],
				},
			},
			default: '',
			placeholder: 'https://email.{region}.amazonaws.com',
		},
		{
			displayName: 'SQS Endpoint',
			name: 'sqsEndpoint',
			description:
				'If you use Amazon VPC to host n8n, you can establish a connection between your VPC and SQS using a VPC endpoint. Leave blank to use the default endpoint.',
			type: 'string',
			displayOptions: {
				show: {
					customEndpoints: [true],
				},
			},
			default: '',
			placeholder: 'https://sqs.{region}.amazonaws.com',
		},
		{
			displayName: 'S3 Endpoint',
			name: 's3Endpoint',
			description:
				'If you use Amazon VPC to host n8n, you can establish a connection between your VPC and S3 using a VPC endpoint. Leave blank to use the default endpoint.',
			type: 'string',
			displayOptions: {
				show: {
					customEndpoints: [true],
				},
			},
			default: '',
			placeholder: 'https://s3.{region}.amazonaws.com',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		let endpoint;
		let service = requestOptions.qs?.service;
		let path = requestOptions.qs?.path;
		const method = requestOptions.method;
		const body = requestOptions.body;
		let region = credentials.region;
		const query = requestOptions.qs?.query as IDataObject;
		if (!requestOptions.baseURL && !requestOptions.url) {
			if (service === 'lambda' && credentials.lambdaEndpoint) {
				endpoint = credentials.lambdaEndpoint;
			} else if (service === 'sns' && credentials.snsEndpoint) {
				endpoint = credentials.snsEndpoint;
			} else if (service === 'sqs' && credentials.sqsEndpoint) {
				endpoint = credentials.sqsEndpoint;
			} else if (service === 's3' && credentials.s3Endpoint) {
				endpoint = credentials.s3Endpoint;
			} else if (service === 'ses' && credentials.sesEndpoint) {
				endpoint = credentials.sesEndpoint;
			} else if (service === 'rekognition' && credentials.rekognitionEndpoint) {
				endpoint = credentials.rekognitionEndpoint;
			} else if (service === 'sqs' && credentials.sqsEndpoint) {
				endpoint = credentials.sqsEndpoint;
			} else if (service) {
				endpoint = `https://${service}.${credentials.region}.amazonaws.com`;
			}
			endpoint = new URL((endpoint as string).replace('{region}', credentials.region as string));
		} else {
			// If no endpoint is set, we try to decompose the path and use the default endpoint
			const customUrl = new URL(requestOptions.baseURL! + requestOptions.url!);
			service = customUrl.hostname.split('.')[0] as string;
			region = customUrl.hostname.split('.')[1] as string;
			if (service === 'sts') {
				try {
					customUrl.searchParams.set('Action', 'GetCallerIdentity');
					customUrl.searchParams.append('Version', '2011-06-15');
				} catch (err) {
					console.log(err);
				}
			}
			path = customUrl.pathname as string;
			endpoint = customUrl;
		}
		if (service === 's3' && credentials.s3Endpoint) {
			path = `${endpoint.pathname}?${queryToString(query).replace(/\+/g, '%2B')}`;
		}
		const signOpts = {
			headers: requestOptions.headers,
			host: endpoint.host,
			method,
			path,
			body,
			region,
		} as Request;

		const securityHeaders = {
			accessKeyId: `${credentials.accessKeyId}`.trim(),
			secretAccessKey: `${credentials.secretAccessKey}`.trim(),
			sessionToken: credentials.temporaryCredentials
				? `${credentials.sessionToken}`.trim()
				: undefined,
		};
		try {
			sign(signOpts, securityHeaders);
		} catch (err) {
			console.log(err);
		}
		const options: IHttpRequestOptions = {
			headers: signOpts.headers,
			method,
			url: endpoint.origin + path,
			body: signOpts.body,
		};

		return options;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://sts.{{$credentials.region}}.amazonaws.com',
			url: '?Action=GetCallerIdentity&Version=2011-06-15',
			method: 'POST',
		},
	};
}

function queryToString(params: IDataObject) {
	return Object.keys(params)
		.map((key) => key + '=' + params[key])
		.join('&');
}
