import { NodeApiError } from 'n8n-workflow';
import { ERROR_MESSAGES } from './constants';
function mapErrorToResponse(errorType, resource, operation, inputValue) {
    const op = operation;
    const nameLabel = resource.charAt(0).toUpperCase() + resource.slice(1);
    const valuePart = inputValue ? ` "${inputValue}"` : '';
    const notFoundMessage = (base, suffix) => ({
        ...base,
        message: `${nameLabel}${valuePart} ${suffix}`,
    });
    const isNotFound = [
        'UserNotFoundException',
        'ResourceNotFoundException',
        'NoSuchEntity',
    ].includes(errorType);
    const isExists = [
        'UsernameExistsException',
        'EntityAlreadyExists',
        'GroupExistsException',
    ].includes(errorType);
    if (isNotFound) {
        if (resource === 'user') {
            if (operation === 'addToGroup') {
                return notFoundMessage(ERROR_MESSAGES.UserGroup.add, 'not found while adding to group.');
            }
            if (operation === 'removeFromGroup') {
                return notFoundMessage(ERROR_MESSAGES.UserGroup.remove, 'not found while removing from group.');
            }
            return notFoundMessage(ERROR_MESSAGES.ResourceNotFound.User[op], 'not found.');
        }
        if (resource === 'group') {
            return notFoundMessage(ERROR_MESSAGES.ResourceNotFound.Group[op], 'not found.');
        }
    }
    if (isExists) {
        const existsMessage = `${nameLabel}${valuePart} already exists.`;
        if (resource === 'user') {
            return { ...ERROR_MESSAGES.EntityAlreadyExists.User, message: existsMessage };
        }
        if (resource === 'group') {
            return { ...ERROR_MESSAGES.EntityAlreadyExists.Group, message: existsMessage };
        }
    }
    return undefined;
}
export async function handleError(data, response) {
    const statusCode = String(response.statusCode);
    if (!statusCode.startsWith('4') && !statusCode.startsWith('5')) {
        return data;
    }
    const resource = this.getNodeParameter('resource');
    const operation = this.getNodeParameter('operation');
    let inputValue;
    if (operation === 'create') {
        if (resource === 'user') {
            inputValue = this.getNodeParameter('newUserName', '');
        }
        else if (resource === 'group') {
            inputValue = this.getNodeParameter('newGroupName', '');
        }
    }
    else {
        inputValue = this.getNodeParameter(resource, '', { extractValue: true });
    }
    const responseBody = response.body;
    const errorType = (responseBody.__type ?? response.headers?.['x-amzn-errortype']);
    const errorMessage = (responseBody.message ??
        response.headers?.['x-amzn-errormessage']);
    if (!errorType) {
        throw new NodeApiError(this.getNode(), response);
    }
    const specificError = mapErrorToResponse(errorType, resource, operation, inputValue);
    throw new NodeApiError(this.getNode(), response, specificError ?? {
        message: errorType,
        description: errorMessage,
    });
}
//# sourceMappingURL=errorHandler.js.map