import {
	NodeApiError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
} from 'n8n-workflow';
import { fetchAndValidateUserPaths } from './dataHandling';

export async function presendStringifyBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	if (requestOptions.body) {
		requestOptions.body = JSON.stringify(requestOptions.body);
	}
	return requestOptions;
}

export async function presendUserFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const additionalFields = this.getNodeParameter('additionalFields', {}) as IDataObject;
	let url = requestOptions.url;
	let userName: string;

	if (url.includes('ListUsers')) {
		const returnAll = this.getNodeParameter('returnAll');
		if (!returnAll) {
			const limit = this.getNodeParameter('limit') as number;

			if (!limit) {
				const specificError = {
					message: 'Limit has no value provided',
					description:
						'Please provide value for "Limit" or switch "Return All" to true to get all results',
				};
				throw new NodeApiError(this.getNode(), {}, specificError);
			} else {
				url += `&MaxItems=${limit}`;
			}
		}

		let prefix = additionalFields.pathPrefix;

		if (prefix && typeof prefix === 'string') {
			prefix = prefix.trim();

			if (!prefix.startsWith('/') || !prefix.endsWith('/')) {
				const specificError = {
					message: 'Invalid path',
					description:
						'Ensure the path is structured correctly, e.g. /division_abc/subdivision_xyz/',
				};
				throw new NodeApiError(this.getNode(), {}, specificError);
			}

			url += `&PathPrefix=${encodeURIComponent(prefix)}`;

			await fetchAndValidateUserPaths.call(this, prefix);
		}
	} else if (url.includes('CreateUser')) {
		userName = this.getNodeParameter('userNameNew') as string;
		url += `&UserName=${userName}`;

		if (additionalFields.permissionsBoundary) {
			const permissionsBoundary = additionalFields.permissionsBoundary as string;

			const arnPattern = /^arn:aws:iam::\d{12}:policy\/[\w\-+\/=._]+$/;
			if (arnPattern.test(permissionsBoundary)) {
				url += `&PermissionsBoundary=${permissionsBoundary}`;
			} else {
				const specificError = {
					message: 'Invalid permissions boundary provided',
					description:
						'Permissions boundaries must be provided in ARN format (e.g. arn:aws:iam::123456789012:policy/ExampleBoundaryPolicy)',
				};
				throw new NodeApiError(this.getNode(), {}, specificError);
			}
		}
		if (additionalFields.path) {
			const path = additionalFields.path as string;
			if (!path.startsWith('/') || !path.endsWith('/')) {
				const specificError = {
					message: 'Invalid path format',
					description:
						'Ensure the path is structured correctly, e.g. /division_abc/subdivision_xyz/',
				};
				throw new NodeApiError(this.getNode(), {}, specificError);
			}
			url += `&Path=${path}`;
		}
		if (additionalFields.tags) {
			const additionalTags = additionalFields.tags as IDataObject;

			const tags = Array.isArray(additionalTags.tags) ? additionalTags.tags : [];

			if (tags.length > 0) {
				let tagString = '';
				tags.forEach((tag, index) => {
					const tagIndex = index + 1;
					tagString += `Tags.member.${tagIndex}.Key=${encodeURIComponent(tag.key)}&Tags.member.${tagIndex}.Value=${encodeURIComponent(tag.value)}&`;
				});

				tagString = tagString.slice(0, -1);

				url += `&${tagString}`;
			}
		}
	} else if (url.includes('User')) {
		userName = (this.getNodeParameter('userName') as IDataObject).value as string;
		url += `&UserName=${userName}`;

		if (url.includes('AddUserToGroup') || url.includes('RemoveUserFromGroup')) {
			const groupName = (this.getNodeParameter('groupName') as IDataObject).value as string;
			url += `&GroupName=${groupName}`;
		}

		if (url.includes('UpdateUser')) {
			const newUserName = this.getNodeParameter('newUserName');

			if (newUserName) {
				const username = newUserName as string;
				url += `&NewUserName=${username}`;
			}
			if (additionalFields.newPath) {
				const path = additionalFields.newPath as string;
				if (!path.startsWith('/') || !path.endsWith('/')) {
					const specificError = {
						message: 'Path could not be updated',
						description:
							'Ensure the path is structured correctly, e.g. /division_abc/subdivision_xyz/',
					};
					throw new NodeApiError(this.getNode(), {}, specificError);
				}
				url += `&NewPath=${path}`;
			}
		}
	}
	requestOptions.url = url;
	return requestOptions;
}

export async function presendGroupFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const additionalFields = this.getNodeParameter('additionalFields', {}) as IDataObject;
	let url = requestOptions.url;
	let groupName: string | undefined;

	if (url.includes('CreateGroup')) {
		groupName = this.getNodeParameter('newName') as string;
		const groupPattern = /^[+=,.@\\-_A-Za-z0-9]+$/;
		if (groupPattern.test(groupName) && groupName.length <= 128) {
			url += `&GroupName=${groupName}`;
		} else {
			const specificError = {
				message: 'Invalid group name provided',
				description:
					"The group name can have up to 128 characters. Valid characters: '+=,.@-_' characters.",
			};
			throw new NodeApiError(this.getNode(), {}, specificError);
		}
		if (additionalFields.path) {
			url += `&Path=${additionalFields.path}`;
		}
	} else if (url.includes('GetGroup') || url.includes('DeleteGroup')) {
		groupName = (this.getNodeParameter('groupName') as IDataObject).value as string;
		url += `&GroupName=${groupName}`;
	} else if (url.includes('UpdateGroup')) {
		groupName = (this.getNodeParameter('groupName') as IDataObject).value as string;
		const newGroupName = this.getNodeParameter('newGroupName');
		if (!/^[a-zA-Z0-9+=,.@_-]+$/.test(groupName) || groupName.length > 128) {
			throw new NodeApiError(
				this.getNode(),
				{},
				{
					message: 'Invalid Group Name',
					description:
						'The group name must be between 1-128 characters and contain only letters, numbers, +=,.@-_',
				},
			);
		}
		url += `&GroupName=${groupName}`;
		if (newGroupName) {
			const name = newGroupName as string;
			if (!/^[a-zA-Z0-9+=,.@_-]+$/.test(name) || name.length > 128) {
				throw new NodeApiError(
					this.getNode(),
					{},
					{
						message: 'Invalid New Name',
						description:
							'The new group name must be between 1-128 characters and contain only letters, numbers, +=,.@-_',
					},
				);
			}
			url += `&NewGroupName=${name}`;
		}
		if (typeof additionalFields.newPath === 'string' && additionalFields.newPath) {
			const path = additionalFields.newPath.trim();
			if (!path.startsWith('/') || !path.endsWith('/')) {
				const specificError = {
					message: 'Invalid path',
					description:
						'Ensure the path is structured correctly, e.g. /division_abc/subdivision_xyz/',
				};
				throw new NodeApiError(this.getNode(), {}, specificError);
			}
			url += `&NewPath=${path}`;
		}
	}

	requestOptions.url = url;
	return requestOptions;
}
