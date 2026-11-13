import { ensureError } from '@n8n/utils/errors/ensure-error';
import { isRecord } from '@n8n/utils/is-record';
import type {
	IAuthenticateGeneric,
	ICredentialTestFunction,
	ICredentialType,
	INodeProperties,
	IRequestOptions,
} from 'n8n-workflow';

export class ServiceNowBasicApi implements ICredentialType {
	name = 'serviceNowBasicApi';

	extends = ['httpBasicAuth'];

	displayName = 'ServiceNow Basic Auth API';

	documentationUrl = 'servicenow';

	properties: INodeProperties[] = [
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			required: true,
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
			hint: 'The subdomain can be extracted from the URL. If the URL is: https://dev99890.service-now.com the subdomain is dev99890',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.user}}',
				password: '={{$credentials.password}}',
			},
		},
	};

	test: ICredentialTestFunction = async function (credential) {
		const { user, password, subdomain } = credential.data ?? {};
		if (
			(typeof user !== 'string' && typeof user !== 'number' && typeof user !== 'boolean') ||
			(typeof password !== 'string' &&
				typeof password !== 'number' &&
				typeof password !== 'boolean') ||
			typeof subdomain !== 'string'
		) {
			return {
				status: 'Error',
				message: 'Connection failed. Enter your user, password, and subdomain.',
			};
		}

		if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(subdomain)) {
			return {
				status: 'Error',
				message: 'Connection failed. Enter only your ServiceNow subdomain, such as dev12345.',
			};
		}

		const options: IRequestOptions = {
			method: 'GET',
			uri: `https://${subdomain}.service-now.com/api/now/table/sys_user`,
			followRedirect: false,
			// Match generic authentication when expressions return primitive values.
			auth: { user: user ? user.toString() : '', pass: password ? password.toString() : '' },
			qs: {
				sysparm_limit: '1',
				sysparm_fields: 'sys_id',
			},
			json: true,
			simple: false,
			resolveWithFullResponse: true,
		};

		try {
			const response: unknown = await this.helpers.request(options);
			if (isRecord(response) && typeof response.statusCode === 'number') {
				const { statusCode } = response;
				// A table permission response does not mean that authentication failed.
				if ((statusCode >= 200 && statusCode < 300) || statusCode === 403) {
					return { status: 'OK', message: 'Connection successful!' };
				}
				return {
					status: 'Error',
					message:
						statusCode === 401
							? 'Authentication failed. Check your user and password.'
							: `Connection failed. ServiceNow returned HTTP ${statusCode}. Check your instance and try again.`,
				};
			}
		} catch (error) {
			return {
				status: 'Error',
				message: `Connection failed: ${ensureError(error).message}. Check your ServiceNow instance and try again.`,
			};
		}

		return {
			status: 'Error',
			message: 'Connection failed. Check your ServiceNow instance and try again.',
		};
	};
}
