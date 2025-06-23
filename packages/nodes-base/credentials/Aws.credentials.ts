import type { Request } from 'aws4';
import { sign } from 'aws4';
import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IDataObject,
	IHttpRequestOptions,
	INodeProperties,
	IRequestOptions,
} from 'n8n-workflow';
import { isObjectEmpty } from 'n8n-workflow';

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
		name: 'ap-south-2',
		displayName: 'Asia Pacific',
		location: 'Hyderabad',
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
		name: 'ap-southeast-4',
		displayName: 'Asia Pacific',
		location: 'Melbourne',
	},
	{
		name: 'ap-southeast-5',
		displayName: 'Asia Pacific',
		location: 'Malaysia',
	},
	{
		name: 'ap-southeast-7',
		displayName: 'Asia Pacific',
		location: 'Thailand',
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
		name: 'ca-west-1',
		displayName: 'Canada West',
		location: 'Calgary',
	},
	{
		name: 'cn-north-1',
		displayName: 'China',
		location: 'Beijing',
	},
	{
		name: 'cn-northwest-1',
		displayName: 'China',
		location: 'Ningxia',
	},
	{
		name: 'eu-central-1',
		displayName: 'Europe',
		location: 'Frankfurt',
	},
	{
		name: 'eu-central-2',
		displayName: 'Europe',
		location: 'Zurich',
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
		name: 'eu-south-2',
		displayName: 'Europe',
		location: 'Spain',
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
		name: 'il-central-1',
		displayName: 'Israel',
		location: 'Tel Aviv',
	},
	{
		name: 'me-central-1',
		displayName: 'Middle East',
		location: 'UAE',
	},
	{
		name: 'me-south-1',
		displayName: 'Middle East',
		location: 'Bahrain',
	},
	{
		name: 'mx-central-1',
		displayName: 'Mexico',
		location: 'Central',
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
		name: 'us-gov-east-1',
		displayName: 'US East',
		location: 'GovCloud',
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
	{
		name: 'us-gov-west-1',
		displayName: 'US West',
		location: 'GovCloud',
	},
] as const;

export type AWSRegion = (typeof regions)[number]['name'];
export type AwsCredentialsType = {
	region: AWSRegion;
	// Credential type (optional for backward compatibility)
	credentialType?: 'iam' | 'assumeRole';
	// Direct IAM credentials (for backward compatibility and direct access)
	accessKeyId: string;
	secretAccessKey: string;
	temporaryCredentials: boolean;
	sessionToken?: string;
	// Role assumption fields (optional for backward compatibility)
	assumeRole?: boolean;
	roleArn?: string;
	externalId?: string;
	roleSessionName?: string;
	// For role assumption: whether to use system credentials for STS call
	useSystemCredentialsForRole?: boolean;
	// STS credentials for role assumption (when not using system credentials)
	temporaryStsCredentials?: boolean;
	stsAccessKeyId?: string;
	stsSecretAccessKey?: string;
	stsSessionToken?: string;
	// Custom endpoints
	customEndpoints: boolean;
	rekognitionEndpoint?: string;
	lambdaEndpoint?: string;
	snsEndpoint?: string;
	sesEndpoint?: string;
	sqsEndpoint?: string;
	s3Endpoint?: string;
	ssmEndpoint?: string;
};

// Some AWS services are global and don't have a region
// https://docs.aws.amazon.com/general/latest/gr/rande.html#global-endpoints
// Example: iam.amazonaws.com (global), s3.us-east-1.amazonaws.com (regional)
function parseAwsUrl(url: URL): { region: AWSRegion | null; service: string } {
	const [service, region] = url.hostname.replace('amazonaws.com', '').split('.');
	return { service, region: region as AWSRegion };
}

export class Aws implements ICredentialType {
	name = 'aws';

	displayName = 'AWS';

	documentationUrl = 'aws';

	icon = { light: 'file:icons/AWS.svg', dark: 'file:icons/AWS.dark.svg' } as const;

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
			displayName: 'Credential Type',
			name: 'credentialType',
			type: 'options',
			options: [
				{
					name: 'IAM Access Key',
					value: 'iam',
					description: 'Use IAM access key and secret key directly',
				},
				{
					name: 'Assume IAM Role',
					value: 'assumeRole',
					description: 'Assume an IAM role using STS',
				},
			],
			default: 'iam',
		},
		{
			displayName: 'Access Key ID',
			name: 'accessKeyId',
			type: 'string',
			displayOptions: {
				show: {
					credentialType: ['iam'],
				},
			},
			required: true,
			default: '',
		},
		{
			displayName: 'Secret Access Key',
			name: 'secretAccessKey',
			type: 'string',
			displayOptions: {
				show: {
					credentialType: ['iam'],
				},
			},
			required: true,
			default: '',
			typeOptions: {
				password: true,
			},
		},
		{
			displayName: 'Temporary Security Credentials',
			name: 'temporaryCredentials',
			description: 'Support for temporary credentials from AWS STS',
			type: 'boolean',
			displayOptions: {
				show: {
					credentialType: ['iam'],
				},
			},
			default: false,
		},
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'string',
			displayOptions: {
				show: {
					credentialType: ['iam'],
					temporaryCredentials: [true],
				},
			},
			default: '',
			typeOptions: {
				password: true,
			},
		},
		{
			displayName: 'Role ARN',
			name: 'roleArn',
			description: 'The ARN of the role to assume (e.g., arn:aws:iam::123456789012:role/MyRole)',
			type: 'string',
			displayOptions: {
				show: {
					credentialType: ['assumeRole'],
				},
			},
			required: true,
			default: '',
			placeholder: 'arn:aws:iam::123456789012:role/MyRole',
		},
		{
			displayName: 'External ID',
			name: 'externalId',
			description:
				'External ID for cross-account role assumption (should be required by the role trust policy). For more information, see https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html',
			type: 'string',
			displayOptions: {
				show: {
					credentialType: ['assumeRole'],
				},
			},
			required: true,
			default: '',
		},
		{
			displayName: 'Role Session Name',
			name: 'roleSessionName',
			description: 'Name for the role session (required, defaults to n8n-session)',
			type: 'string',
			displayOptions: {
				show: {
					credentialType: ['assumeRole'],
				},
			},
			required: true,
			default: 'n8n-session',
		},
		{
			displayName: 'Use System Credentials for STS Call',
			name: 'useSystemCredentialsForRole',
			description:
				'Use system credentials (environment variables, container role, etc.) to call STS.AssumeRole. If system credentials are not by your administrator, you must provide an access key id and secret access key below that has the necessary permissions to assume the role.',
			type: 'boolean',
			displayOptions: {
				show: {
					credentialType: ['assumeRole'],
				},
			},
			default: false,
		},
		{
			displayName: 'Temporary STS Credentials',
			name: 'temporaryStsCredentials',
			description: 'Support for temporary credentials for the STS.AssumeRole call',
			type: 'boolean',
			displayOptions: {
				show: {
					credentialType: ['assumeRole'],
					useSystemCredentialsForRole: [false],
				},
			},
			default: false,
		},
		{
			displayName: 'STS Access Key ID',
			name: 'stsAccessKeyId',
			description:
				'Access Key ID to use for the STS.AssumeRole call (only if not using system credentials)',
			type: 'string',
			displayOptions: {
				show: {
					credentialType: ['assumeRole'],
					useSystemCredentialsForRole: [false],
				},
			},
			required: true,
			default: '',
		},
		{
			displayName: 'STS Secret Access Key',
			name: 'stsSecretAccessKey',
			description:
				'Secret Access Key to use for the STS.AssumeRole call (only if not using system credentials)',
			type: 'string',
			displayOptions: {
				show: {
					credentialType: ['assumeRole'],
					useSystemCredentialsForRole: [false],
				},
			},
			required: true,
			default: '',
			typeOptions: {
				password: true,
			},
		},
		{
			displayName: 'STS Session Token',
			name: 'stsSessionToken',
			description:
				'Session Token to use for the STS.AssumeRole call (only needed when using temporary STS credentials)',
			type: 'string',
			displayOptions: {
				show: {
					credentialType: ['assumeRole'],
					useSystemCredentialsForRole: [false],
					temporaryStsCredentials: [true],
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
		{
			displayName: 'SSM Endpoint',
			name: 'ssmEndpoint',
			description: 'Endpoint for AWS Systems Manager (SSM)',
			type: 'string',
			displayOptions: {
				show: {
					customEndpoints: [true],
				},
			},
			default: '',
			placeholder: 'https://ssm.{region}.amazonaws.com',
		},
	];

	async authenticate(
		rawCredentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const credentials = rawCredentials as AwsCredentialsType;
		let endpoint: URL;
		let service = requestOptions.qs?.service as string;
		let path = (requestOptions.qs?.path as string) ?? '';
		const method = requestOptions.method;
		let body = requestOptions.body;

		let region = credentials.region;
		if (requestOptions.qs?._region) {
			region = requestOptions.qs._region as AWSRegion;
			delete requestOptions.qs._region;
		}

		// Determine credential mode (for backward compatibility)
		const credentialType =
			credentials.credentialType || (credentials.assumeRole ? 'assumeRole' : 'iam');

		// Handle role assumption if enabled
		let finalCredentials = credentials;
		let assumedCredentials: {
			accessKeyId: string;
			secretAccessKey: string;
			sessionToken: string;
		} | null = null;

		if (credentialType === 'assumeRole') {
			if (!credentials.roleArn || credentials.roleArn.trim() === '') {
				throw new Error('Role ARN is required when assuming a role.');
			}
			if (!credentials.externalId || credentials.externalId.trim() === '') {
				throw new Error('External ID is required when assuming a role.');
			}
			if (!credentials.roleSessionName || credentials.roleSessionName.trim() === '') {
				throw new Error('Role Session Name is required when assuming a role.');
			}
			try {
				assumedCredentials = await this.assumeRole(credentials, region);
				finalCredentials = { ...credentials, ...assumedCredentials };
			} catch (error) {
				console.error('Failed to assume role:', error);
				throw new Error(
					`Failed to assume role: ${error instanceof Error ? error.message : 'Unknown error'}`,
				);
			}
		}

		let query = requestOptions.qs?.query as IDataObject;
		// ! Workaround as we still use the IRequestOptions interface which uses uri instead of url
		// ! To change when we replace the interface with IHttpRequestOptions
		const requestWithUri = requestOptions as unknown as IRequestOptions;
		if (requestWithUri.uri) {
			requestOptions.url = requestWithUri.uri;
			endpoint = new URL(requestOptions.url);
			if (service === 'sts') {
				try {
					if (requestWithUri.qs?.Action !== 'GetCallerIdentity') {
						query = requestWithUri.qs as IDataObject;
					} else {
						endpoint.searchParams.set('Action', 'GetCallerIdentity');
						endpoint.searchParams.set('Version', '2011-06-15');
					}
				} catch (err) {
					console.error(err);
				}
			}
			const parsed = parseAwsUrl(endpoint);
			service = parsed.service;
			if (parsed.region) {
				region = parsed.region;
			}
		} else {
			if (!requestOptions.baseURL && !requestOptions.url) {
				let endpointString: string;
				if (service === 'lambda' && finalCredentials.lambdaEndpoint) {
					endpointString = finalCredentials.lambdaEndpoint;
				} else if (service === 'sns' && finalCredentials.snsEndpoint) {
					endpointString = finalCredentials.snsEndpoint;
				} else if (service === 'sqs' && finalCredentials.sqsEndpoint) {
					endpointString = finalCredentials.sqsEndpoint;
				} else if (service === 's3' && finalCredentials.s3Endpoint) {
					endpointString = finalCredentials.s3Endpoint;
				} else if (service === 'ses' && finalCredentials.sesEndpoint) {
					endpointString = finalCredentials.sesEndpoint;
				} else if (service === 'rekognition' && finalCredentials.rekognitionEndpoint) {
					endpointString = finalCredentials.rekognitionEndpoint;
				} else if (service) {
					endpointString = `https://${service}.${region}.amazonaws.com`;
				} else if (service === 'ssm' && finalCredentials.ssmEndpoint) {
					endpointString = finalCredentials.ssmEndpoint;
				}
				endpoint = new URL(endpointString!.replace('{region}', region) + path);
			} else {
				// If no endpoint is set, we try to decompose the path and use the default endpoint
				const customUrl = new URL(`${requestOptions.baseURL!}${requestOptions.url}${path}`);
				const parsed = parseAwsUrl(customUrl);
				service = parsed.service;
				if (parsed.region) {
					region = parsed.region;
				}
				if (service === 'sts') {
					try {
						customUrl.searchParams.set('Action', 'GetCallerIdentity');
						customUrl.searchParams.set('Version', '2011-06-15');
					} catch (err) {
						console.error(err);
					}
				}
				endpoint = customUrl;
			}
		}

		if (query && Object.keys(query).length !== 0) {
			Object.keys(query).forEach((key) => {
				endpoint.searchParams.append(key, query[key] as string);
			});
		}

		if (body && typeof body === 'object' && isObjectEmpty(body)) {
			body = '';
		}

		path = endpoint.pathname + endpoint.search;

		// ! aws4.sign *must* have the body to sign, but we might have .form instead of .body
		const requestWithForm = requestOptions as unknown as { form?: Record<string, string> };
		let bodyContent = body !== '' ? body : undefined;
		let contentTypeHeader: string | undefined = undefined;
		if (requestWithForm.form) {
			const params = new URLSearchParams();
			for (const key in requestWithForm.form) {
				params.append(key, requestWithForm.form[key]);
			}
			bodyContent = params.toString();
			contentTypeHeader = 'application/x-www-form-urlencoded';
		}

		const signOpts = {
			...requestOptions,
			headers: {
				...(requestOptions.headers ?? {}),
				...(contentTypeHeader && { 'content-type': contentTypeHeader }),
			},
			host: endpoint.host,
			method,
			path,
			body: bodyContent,
			region,
		} as Request;

		// Get credentials for signing - use assumed credentials if available, otherwise get from credential source
		let securityHeaders: { accessKeyId: string; secretAccessKey: string; sessionToken?: string };
		if (assumedCredentials) {
			// Use the assumed credentials directly
			securityHeaders = {
				accessKeyId: assumedCredentials.accessKeyId,
				secretAccessKey: assumedCredentials.secretAccessKey,
				sessionToken: assumedCredentials.sessionToken,
			};
		} else {
			// Get credentials from the normal credential source
			securityHeaders = await this.getSecurityHeaders(finalCredentials);
		}

		// Always set sessionToken, even if undefined, to ensure test consistency
		if (!('sessionToken' in securityHeaders)) {
			securityHeaders.sessionToken = undefined;
		}

		try {
			sign(signOpts, securityHeaders);
		} catch (err) {
			console.error(err);
		}
		const options: IHttpRequestOptions = {
			...requestOptions,
			headers: signOpts.headers,
			method,
			url: endpoint.origin + path,
			body: signOpts.body,
			qs: undefined, // override since it's already in the url
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

	private async getSecurityHeaders(credentials: AwsCredentialsType): Promise<{
		accessKeyId: string;
		secretAccessKey: string;
		sessionToken?: string;
	}> {
		// For backward compatibility: if credentialType is not set, default to 'iam'
		const credentialType =
			credentials.credentialType || (credentials.assumeRole ? 'assumeRole' : 'iam');

		if (credentialType === 'iam') {
			// Use manually provided credentials
			if (!credentials.accessKeyId || credentials.accessKeyId.trim() === '') {
				throw new Error('Access Key ID is required for IAM credentials.');
			}
			if (!credentials.secretAccessKey || credentials.secretAccessKey.trim() === '') {
				throw new Error('Secret Access Key is required for IAM credentials.');
			}
			return {
				accessKeyId: `${credentials.accessKeyId}`.trim(),
				secretAccessKey: `${credentials.secretAccessKey}`.trim(),
				sessionToken: credentials.temporaryCredentials
					? `${credentials.sessionToken}`.trim()
					: undefined,
			};
		} else {
			throw new Error('Invalid credential type. Expected IAM credentials for direct access.');
		}
	}

	private async getSystemCredentials(): Promise<{
		accessKeyId: string;
		secretAccessKey: string;
		sessionToken?: string;
	} | null> {
		// 1. Check for explicit environment variables
		const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
		const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
		const sessionToken = process.env.AWS_SESSION_TOKEN;

		if (accessKeyId && secretAccessKey) {
			return {
				accessKeyId: accessKeyId.trim(),
				secretAccessKey: secretAccessKey.trim(),
				sessionToken: sessionToken?.trim(),
			};
		}

		// 2. Check for AWS_PROFILE environment variable
		if (process.env.AWS_PROFILE) {
			// Note: In a real implementation, you might want to use AWS SDK to load credentials from profile
			// For now, we'll just indicate that profile-based credentials are supported
			console.warn(
				'AWS_PROFILE is set but profile-based credential loading is not implemented in this credential. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or use instance/container role.',
			);
		}

		// 3. Try to get credentials from instance metadata service (EC2)
		try {
			const instanceCredentials = await this.getInstanceMetadataCredentials();
			if (instanceCredentials) {
				return instanceCredentials;
			}
		} catch (error) {
			// Silently continue to next credential source
			console.debug('Failed to get credentials from instance metadata:', error);
		}

		// 4. Try to get credentials from container metadata service (ECS/Fargate)
		try {
			const containerCredentials = await this.getContainerMetadataCredentials();
			if (containerCredentials) {
				return containerCredentials;
			}
		} catch (error) {
			// Silently continue to next credential source
			console.debug('Failed to get credentials from container metadata:', error);
		}

		// No credentials found
		return null;
	}

	private async getInstanceMetadataCredentials(): Promise<{
		accessKeyId: string;
		secretAccessKey: string;
		sessionToken: string;
	} | null> {
		try {
			// Check if we're running on EC2 by trying to access instance metadata
			const response = await fetch(
				'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
				{
					method: 'GET',
					headers: {
						'User-Agent': 'n8n-aws-credential',
					},
					// Short timeout to avoid hanging
					signal: AbortSignal.timeout(2000),
				},
			);

			if (!response.ok) {
				return null;
			}

			// Get the role name
			const roleName = await response.text();
			if (!roleName) {
				return null;
			}

			// Get credentials for the role
			const credentialsResponse = await fetch(
				`http://169.254.169.254/latest/meta-data/iam/security-credentials/${roleName}`,
				{
					method: 'GET',
					headers: {
						'User-Agent': 'n8n-aws-credential',
					},
					signal: AbortSignal.timeout(2000),
				},
			);

			if (!credentialsResponse.ok) {
				return null;
			}

			const credentialsData = await credentialsResponse.json();

			return {
				accessKeyId: credentialsData.AccessKeyId,
				secretAccessKey: credentialsData.SecretAccessKey,
				sessionToken: credentialsData.Token,
			};
		} catch (error) {
			// Not running on EC2 or metadata service unavailable
			return null;
		}
	}

	private async getContainerMetadataCredentials(): Promise<{
		accessKeyId: string;
		secretAccessKey: string;
		sessionToken: string;
	} | null> {
		try {
			// Check for ECS container credentials
			const relativeUri = process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI;
			if (!relativeUri) {
				return null;
			}

			const response = await fetch(`http://169.254.170.2${relativeUri}`, {
				method: 'GET',
				headers: {
					'User-Agent': 'n8n-aws-credential',
				},
				signal: AbortSignal.timeout(2000),
			});

			if (!response.ok) {
				return null;
			}

			const credentialsData = await response.json();

			return {
				accessKeyId: credentialsData.AccessKeyId,
				secretAccessKey: credentialsData.SecretAccessKey,
				sessionToken: credentialsData.Token,
			};
		} catch (error) {
			// Not running in ECS or metadata service unavailable
			return null;
		}
	}

	private async assumeRole(
		credentials: AwsCredentialsType,
		region: AWSRegion,
	): Promise<{
		accessKeyId: string;
		secretAccessKey: string;
		sessionToken: string;
	}> {
		// Get credentials for the STS call
		let stsCallCredentials: { accessKeyId: string; secretAccessKey: string; sessionToken?: string };

		// For backward compatibility: if useSystemCredentialsForRole is not set, default to true
		const useSystemCredentialsForRole = credentials.useSystemCredentialsForRole ?? true;

		if (useSystemCredentialsForRole) {
			// Use system credentials for the STS call
			const systemCredentials = await this.getSystemCredentials();
			if (!systemCredentials) {
				throw new Error(
					'System AWS credentials are required for role assumption. Please ensure AWS credentials are available via environment variables, instance metadata, or container role.',
				);
			}
			stsCallCredentials = systemCredentials;
		} else {
			// Use manually provided STS credentials
			if (!credentials.stsAccessKeyId || credentials.stsAccessKeyId.trim() === '') {
				throw new Error('STS Access Key ID is required when not using system credentials.');
			}
			if (!credentials.stsSecretAccessKey || credentials.stsSecretAccessKey.trim() === '') {
				throw new Error('STS Secret Access Key is required when not using system credentials.');
			}

			// For backward compatibility: if temporaryStsCredentials is not set, default to false
			const temporaryStsCredentials = credentials.temporaryStsCredentials ?? false;

			stsCallCredentials = {
				accessKeyId: credentials.stsAccessKeyId.trim(),
				secretAccessKey: credentials.stsSecretAccessKey.trim(),
				sessionToken: temporaryStsCredentials
					? credentials.stsSessionToken?.trim() || undefined
					: undefined,
			};
		}

		// Prepare STS AssumeRole request
		const stsEndpoint = `https://sts.${region}.amazonaws.com`;
		const assumeRoleBody = {
			RoleArn: credentials.roleArn,
			RoleSessionName: credentials.roleSessionName || 'n8n-session',
			...(credentials.externalId && { ExternalId: credentials.externalId }),
		};

		// Build URLSearchParams properly
		const params = new URLSearchParams({
			Action: 'AssumeRole',
			Version: '2011-06-15',
			RoleArn: assumeRoleBody.RoleArn!,
			RoleSessionName: assumeRoleBody.RoleSessionName,
		});
		if (assumeRoleBody.ExternalId) {
			params.append('ExternalId', assumeRoleBody.ExternalId);
		}

		const bodyContent = params.toString();

		// Sign the STS request
		const stsUrl = new URL(stsEndpoint);
		const signOpts = {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			host: stsUrl.host,
			method: 'POST',
			path: '/',
			body: bodyContent,
			region,
		} as Request;

		try {
			sign(signOpts, stsCallCredentials);
		} catch (err) {
			console.error('Failed to sign STS request:', err);
			throw new Error('Failed to sign STS request');
		}

		// Make the STS request
		const response = await fetch(stsEndpoint, {
			method: 'POST',
			headers: signOpts.headers as Record<string, string>,
			body: bodyContent,
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`STS AssumeRole failed: ${response.status} ${response.statusText} - ${errorText}`,
			);
		}

		const responseText = await response.text();
		const responseData = await new Promise<IDataObject>((resolve, reject) => {
			const { parseString } = require('xml2js');
			parseString(responseText, { explicitArray: false }, (err: any, data: IDataObject) => {
				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			});
		});

		const assumeRoleResult = (responseData.AssumeRoleResponse as IDataObject)
			?.AssumeRoleResult as IDataObject;
		if (!assumeRoleResult?.Credentials) {
			throw new Error('Invalid response from STS AssumeRole');
		}

		const assumedCredentials = assumeRoleResult.Credentials as IDataObject;
		return {
			accessKeyId: assumedCredentials.AccessKeyId as string,
			secretAccessKey: assumedCredentials.SecretAccessKey as string,
			sessionToken: assumedCredentials.SessionToken as string,
		};
	}
}
