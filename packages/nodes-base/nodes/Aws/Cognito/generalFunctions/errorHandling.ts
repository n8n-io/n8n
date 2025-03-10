import {
	NodeApiError,
	type IDataObject,
	type JsonObject,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
} from 'n8n-workflow';

export async function handleErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		const resource = this.getNodeParameter('resource') as string;
		const operation = this.getNodeParameter('operation') as string;
		const responseBody = response.body as IDataObject;
		const errorType: string | undefined =
			typeof responseBody.__type === 'string'
				? responseBody.__type
				: typeof response.headers?.['x-amzn-errortype'] === 'string'
					? response.headers?.['x-amzn-errortype']
					: undefined;
		const errorMessage: string | undefined =
			typeof responseBody.message === 'string'
				? responseBody.message
				: typeof response.headers?.['x-amzn-errormessage'] === 'string'
					? response.headers?.['x-amzn-errormessage']
					: undefined;

		const throwError = (message: string, description: string) => {
			throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
				message,
				description,
			});
		};

		const errorMappings: Record<
			string,
			Record<
				string,
				{
					condition: (errorType: string, errorMessage: string) => boolean;
					message: string;
					description: string;
				}
			>
		> = {
			group: {
				delete: {
					condition: (errType) =>
						errType === 'ResourceNotFoundException' || errType === 'NoSuchEntity',
					message: 'The group you are deleting could not be found.',
					description: 'Adjust the "Group" parameter setting to delete the group correctly.',
				},
				get: {
					condition: (errType) =>
						errType === 'ResourceNotFoundException' || errType === 'NoSuchEntity',
					message: 'The group you are requesting could not be found.',
					description: 'Adjust the "Group" parameter setting to retrieve the group correctly.',
				},
				update: {
					condition: (errType) =>
						errType === 'ResourceNotFoundException' || errType === 'NoSuchEntity',
					message: 'The group you are updating could not be found.',
					description: 'Adjust the "Group" parameter setting to update the group correctly.',
				},
				create: {
					condition: (errType) =>
						errType === 'EntityAlreadyExists' || errType === 'GroupExistsException',
					message: 'The group you are trying to create already exists.',
					description: 'Adjust the "Group Name" parameter setting to create the group correctly.',
				},
			},
			user: {
				create: {
					condition: (errType, errMsg) =>
						errType === 'UserNotFoundException' ||
						(errType === 'UsernameExistsException' && errMsg === 'User account already exists'),
					message: 'The user you are trying to create already exists.',
					description: 'Adjust the "User Name" parameter setting to create the user correctly.',
				},
				addToGroup: {
					condition: (errType, errMsg) => {
						const user = this.getNodeParameter('user.value', '') as string;
						const group = this.getNodeParameter('group.value', '') as string;
						return (
							(errType === 'UserNotFoundException' &&
								typeof errMsg === 'string' &&
								errMsg.includes(user)) ||
							(errType === 'ResourceNotFoundException' &&
								typeof errMsg === 'string' &&
								errMsg.includes(group))
						);
					},
					message: 'The user/group you are trying to add could not be found.',
					description:
						'Adjust the "User" and "Group" parameters to add the user to the group correctly.',
				},
				delete: {
					condition: (errType) => errType === 'UserNotFoundException',
					message: 'The user you are requesting could not be found.',
					description: 'Adjust the "User" parameter setting to delete the user correctly.',
				},
				get: {
					condition: (errType) => errType === 'UserNotFoundException',
					message: 'The user you are requesting could not be found.',
					description: 'Adjust the "User" parameter setting to retrieve the user correctly.',
				},
				removeFromGroup: {
					condition: (errType, errMsg) => {
						const user = this.getNodeParameter('user.value', '') as string;
						const group = this.getNodeParameter('group.value', '') as string;
						return (
							(errType === 'UserNotFoundException' &&
								typeof errMsg === 'string' &&
								errMsg.includes(user)) ||
							(errType === 'ResourceNotFoundException' &&
								typeof errMsg === 'string' &&
								errMsg.includes(group))
						);
					},
					message: 'The user/group you are trying to remove could not be found.',
					description:
						'Adjust the "User" and "Group" parameters to remove the user from the group correctly.',
				},
				update: {
					condition: (errType) => errType === 'UserNotFoundException',
					message: 'The user you are updating could not be found.',
					description: 'Adjust the "User" parameter setting to update the user correctly.',
				},
			},
		};

		const resourceMapping = errorMappings[resource]?.[operation];
		if (resourceMapping && resourceMapping.condition(errorType ?? '', errorMessage ?? '')) {
			throwError(resourceMapping.message, resourceMapping.description);
		}

		throw new NodeApiError(this.getNode(), response as unknown as JsonObject);
	}

	return data;
}
