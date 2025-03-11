import {
	type ILoadOptionsFunctions,
	NodeApiError,
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	jsonParse,
} from 'n8n-workflow';

import { validateEmail, validatePhoneNumber } from './helpers';
import { makeAwsRequest } from './makeAwsRequest';

export async function presendStringifyBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	if (requestOptions.body) {
		requestOptions.body = JSON.stringify(requestOptions.body);
	}
	return requestOptions;
}

export async function presendGroupFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const newGroupName = this.getNodeParameter('newGroupName', '') as string;

	const groupNameRegex = /^[\p{L}\p{M}\p{S}\p{N}\p{P}]+$/u;
	if (!groupNameRegex.test(newGroupName)) {
		throw new NodeApiError(this.getNode(), {
			message: 'Invalid format for Group Name',
			description: 'Group Name should not contain spaces.',
		});
	}

	return requestOptions;
}

export async function presendAdditionalFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const additionalFields = this.getNodeParameter('additionalFields', {}) as IDataObject;

	if (Object.keys(additionalFields).length === 0) {
		throw new NodeApiError(this.getNode(), {
			message: 'No group field provided',
			description: 'Select at least one additional field to update.',
		});
	}

	return requestOptions;
}

export async function presendVerifyPath(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const path = this.getNodeParameter('path', '/') as string;

	const validPathRegex = /^\/[\u0021-\u007E]*\/$/;
	if (!validPathRegex.test(path) || path.length > 512) {
		throw new NodeApiError(this.getNode(), {
			message: 'Invalid Path format',
			description:
				'Path must be between 1 and 512 characters, start and end with a forward slash, and contain valid ASCII characters.',
		});
	}

	return requestOptions;
}

export async function presendUserFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
	paginationToken?: string,
): Promise<IHttpRequestOptions> {
	const operation = this.getNodeParameter('operation') as string;
	const userPoolId = (this.getNodeParameter('userPoolId') as IDataObject).value;

	if (!userPoolId) {
		throw new NodeApiError(this.getNode(), {
			message: 'User Pool ID is required',
			description: 'Please provide a valid User Pool ID.',
		});
	}

	const opts: IHttpRequestOptions = {
		url: '',
		method: 'POST',
		headers: {
			'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsers',
		},
		body: JSON.stringify({
			UserPoolId: userPoolId,
			MaxResults: 60,
			NextToken: paginationToken ?? undefined,
		}),
	};

	const userAttributes = await makeAwsRequest.call(this, {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.DescribeUserPool' },
		body: JSON.stringify({ UserPoolId: userPoolId }),
	});
	const userPoolDetails = userAttributes?.UserPool as { UsernameAttributes?: string[] } | undefined;
	const allowedUsernameAttributes = userPoolDetails?.UsernameAttributes ?? [];

	let formattedUsername;

	if (operation !== 'create') {
		const userName = (this.getNodeParameter('userName') as IDataObject).value;
		const responseData: IDataObject = await makeAwsRequest.call(
			this as unknown as ILoadOptionsFunctions,
			opts,
		);
		const usersList = responseData.Users as IDataObject[] | undefined;

		let currentUser = '';

		if (usersList) {
			usersList.forEach((user) => {
				const storedUsername = user.Username as string;
				const storedUserAttributes = user.Attributes as
					| Array<{ Name: string; Value: string }>
					| undefined;
				const sub = storedUserAttributes?.find((attr) => attr.Name === 'sub')?.Value ?? '';

				if (sub === userName) {
					currentUser = storedUsername;
				}
			});
		}

		formattedUsername =
			allowedUsernameAttributes.includes('email') ||
			allowedUsernameAttributes.includes('phone_number')
				? userName
				: currentUser;
	} else {
		const newUsername = this.getNodeParameter('newUserName') as string;

		if (allowedUsernameAttributes.includes('email')) {
			if (!validateEmail(newUsername)) {
				throw new NodeApiError(this.getNode(), {
					message: 'Invalid format for User Name',
					description: 'Please provide a valid email address (e.g., name@gmail.com)',
				});
			}
			formattedUsername = newUsername;
		} else if (allowedUsernameAttributes.includes('phone_number')) {
			if (!validatePhoneNumber(newUsername)) {
				throw new NodeApiError(this.getNode(), {
					message: 'Invalid format for User Name',
					description:
						'Use an international phone number format, starting with + and followed by 2 to 15 digits (e.g., +14155552671)',
				});
			}
			formattedUsername = newUsername;
		} else {
			formattedUsername = newUsername;
		}
	}

	let body;
	if (typeof requestOptions.body === 'string') {
		try {
			body = JSON.parse(requestOptions.body);
		} catch {
			throw new NodeOperationError(this.getNode(), 'Failed to parse requestOptions body');
		}
	} else if (requestOptions.body) {
		body = requestOptions.body;
	}

	if (formattedUsername) {
		requestOptions.body = JSON.stringify({ ...body, Username: formattedUsername });
	}

	return requestOptions;
}

export async function presendFilters(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const filters = this.getNodeParameter('filters', {}) as IDataObject;

	if (!filters?.filter) {
		return requestOptions;
	}

	const { attribute: filterAttribute, value: filterValue } = filters.filter as {
		attribute?: string;
		value?: string;
	};

	if (!filterValue) {
		throw new NodeApiError(this.getNode(), {
			message: "Invalid value for 'Value'",
			description: 'Please provide a value for filtering.',
		});
	}

	let body = {};
	if (typeof requestOptions.body === 'string') {
		try {
			body = jsonParse(requestOptions.body);
		} catch {
			throw new NodeOperationError(this.getNode(), 'Failed to parse requestOptions body');
		}
	} else if (requestOptions.body) {
		body = requestOptions.body;
	}

	const filter = filterAttribute ? `"${filterAttribute}"^="${filterValue}"` : '';

	return {
		...requestOptions,
		body: JSON.stringify({ ...body, Filter: filter }),
	};
}

export async function presendAttributes(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const attributes = this.getNodeParameter('userAttributes.attributes', []);

	let body;
	if (typeof requestOptions.body === 'string') {
		try {
			body = JSON.parse(requestOptions.body);
		} catch {
			throw new NodeOperationError(this.getNode(), 'Failed to parse requestOptions body');
		}
	} else if (requestOptions.body) {
		body = requestOptions.body;
	}

	if (Array.isArray(attributes)) {
		if (!attributes?.length) {
			throw new NodeApiError(this.getNode(), {
				message: 'No user field provided',
				description: 'Select at least one user field to update.',
			});
		}

		body.UserAttributes = attributes.map((attribute) => {
			const { attributeType, standardName, customName, Value } = attribute;

			if (!Value) {
				throw new NodeApiError(this.getNode(), {
					message: 'Invalid User Attribute',
					description: 'Each attribute must have a value.',
				});
			}

			const attributeName =
				attributeType === 'standard'
					? standardName
					: customName?.startsWith('custom:')
						? customName
						: `custom:${customName}`;

			if (!attributeName) {
				throw new NodeApiError(this.getNode(), {
					message: 'Invalid Attribute Name',
					description: 'Each attribute must have a valid name.',
				});
			}
			return { Name: attributeName, Value };
		});
	}

	requestOptions.body = JSON.stringify(body);

	return requestOptions;
}
