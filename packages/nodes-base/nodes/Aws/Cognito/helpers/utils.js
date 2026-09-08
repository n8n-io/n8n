import { jsonParse, NodeApiError, NodeOperationError } from 'n8n-workflow';
import { awsApiRequest, awsApiRequestAllItems } from '../transport';
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhoneNumber = (phone) => /^\+[0-9]\d{1,14}$/.test(phone);
export async function preSendStringifyBody(requestOptions) {
    if (requestOptions.body) {
        requestOptions.body = JSON.stringify(requestOptions.body);
    }
    return requestOptions;
}
export async function getUserPool(userPoolId) {
    if (!userPoolId) {
        throw new NodeOperationError(this.getNode(), 'User Pool ID is required');
    }
    const response = (await awsApiRequest.call(this, 'POST', 'DescribeUserPool', JSON.stringify({ UserPoolId: userPoolId })));
    if (!response?.UserPool) {
        throw new NodeOperationError(this.getNode(), 'User Pool not found in response');
    }
    return response.UserPool;
}
export async function getUsersInGroup(groupName, userPoolId) {
    if (!userPoolId) {
        throw new NodeOperationError(this.getNode(), 'User Pool ID is required');
    }
    const requestBody = {
        UserPoolId: userPoolId,
        GroupName: groupName,
    };
    const allUsers = (await awsApiRequestAllItems.call(this, 'POST', 'ListUsersInGroup', requestBody, 'Users'));
    return allUsers;
}
export async function getUserNameFromExistingUsers(userName, userPoolId, isEmailOrPhone) {
    if (isEmailOrPhone) {
        return userName;
    }
    const usersResponse = (await awsApiRequest.call(this, 'POST', 'ListUsers', JSON.stringify({
        UserPoolId: userPoolId,
        Filter: `sub = "${userName}"`,
    })));
    const username = usersResponse.Users && usersResponse.Users.length > 0
        ? usersResponse.Users[0].Username
        : undefined;
    return username;
}
export async function preSendUserFields(requestOptions) {
    const operation = this.getNodeParameter('operation');
    const userPoolId = this.getNodeParameter('userPool', undefined, {
        extractValue: true,
    });
    const userPool = await getUserPool.call(this, userPoolId);
    const usernameAttributes = userPool.UsernameAttributes ?? [];
    const isEmailAuth = usernameAttributes.includes('email');
    const isPhoneAuth = usernameAttributes.includes('phone_number');
    const isEmailOrPhone = isEmailAuth || isPhoneAuth;
    const getValidatedNewUserName = () => {
        const newUsername = this.getNodeParameter('newUserName');
        if (isEmailAuth && !validateEmail(newUsername)) {
            throw new NodeApiError(this.getNode(), {
                message: 'Invalid email format',
                description: 'Please provide a valid email (e.g., name@gmail.com)',
            });
        }
        if (isPhoneAuth && !validatePhoneNumber(newUsername)) {
            throw new NodeApiError(this.getNode(), {
                message: 'Invalid phone number format',
                description: 'Please provide a valid phone number (e.g., +14155552671)',
            });
        }
        return newUsername;
    };
    const finalUserName = operation === 'create'
        ? getValidatedNewUserName()
        : await getUserNameFromExistingUsers.call(this, this.getNodeParameter('user', undefined, { extractValue: true }), userPoolId, isEmailOrPhone);
    const body = jsonParse(String(requestOptions.body), {
        acceptJSObject: true,
        errorMessage: 'Invalid request body. Request body must be valid JSON.',
    });
    return {
        ...requestOptions,
        body: JSON.stringify({
            ...body,
            ...(finalUserName ? { Username: finalUserName } : {}),
        }),
    };
}
export async function processGroup(items, response) {
    const userPoolId = this.getNodeParameter('userPool', undefined, {
        extractValue: true,
    });
    const includeUsers = this.getNodeParameter('includeUsers');
    const body = response.body;
    if (body.Group) {
        const group = body.Group;
        if (!includeUsers) {
            return this.helpers.returnJsonArray({ ...group });
        }
        const users = await getUsersInGroup.call(this, group.GroupName, userPoolId);
        return this.helpers.returnJsonArray({ ...group, Users: users });
    }
    const groups = response.body.Groups ?? [];
    if (!includeUsers) {
        return items;
    }
    const processedGroups = [];
    for (const group of groups) {
        const users = await getUsersInGroup.call(this, group.GroupName, userPoolId);
        processedGroups.push({
            ...group,
            Users: users,
        });
    }
    return items.map((item) => ({ json: { ...item.json, Groups: processedGroups } }));
}
export async function validateArn(requestOptions) {
    const arn = this.getNodeParameter('additionalFields.arn', '');
    const arnRegex = /^arn:[-.\w+=/,@]+:[-.\w+=/,@]+:([-.\w+=/,@]*)?:[0-9]+:[-.\w+=/,@]+(:[-.\w+=/,@]+)?(:[-.\w+=/,@]+)?$/;
    if (!arnRegex.test(arn)) {
        throw new NodeApiError(this.getNode(), {
            message: 'Invalid ARN format',
            description: 'Please provide a valid AWS ARN (e.g., arn:aws:iam::123456789012:role/GroupRole).',
        });
    }
    return requestOptions;
}
export async function simplifyUserPool(items, _response) {
    const simple = this.getNodeParameter('simple');
    if (!simple) {
        return items;
    }
    return items
        .map((item) => {
        const data = item.json?.UserPool;
        if (!data) {
            return;
        }
        const { AccountRecoverySetting, AdminCreateUserConfig, EmailConfiguration, LambdaConfig, Policies, SchemaAttributes, UserAttributeUpdateSettings, UserPoolTags, UserPoolTier, VerificationMessageTemplate, ...selectedData } = data;
        return { json: { UserPool: { ...selectedData } } };
    })
        .filter(Boolean);
}
export async function simplifyUser(items, _response) {
    const simple = this.getNodeParameter('simple');
    if (!simple) {
        return items;
    }
    return items
        .map((item) => {
        const data = item.json;
        if (!data) {
            return;
        }
        if (Array.isArray(data.Users)) {
            const users = data.Users;
            const simplifiedUsers = users.map((user) => {
                const attributesArray = user.Attributes ?? [];
                const userAttributes = Object.fromEntries(attributesArray
                    .filter(({ Name }) => Name?.trim())
                    .map(({ Name, Value }) => [Name, Value ?? '']));
                const { Attributes, ...rest } = user;
                return { ...rest, ...userAttributes };
            });
            return { json: { ...data, Users: simplifiedUsers } };
        }
        if (Array.isArray(data.UserAttributes)) {
            const attributesArray = data.UserAttributes;
            const userAttributes = Object.fromEntries(attributesArray
                .filter(({ Name }) => Name?.trim())
                .map(({ Name, Value }) => [Name, Value ?? '']));
            const { UserAttributes, ...rest } = data;
            return { json: { ...rest, ...userAttributes } };
        }
        return item;
    })
        .filter(Boolean);
}
export async function preSendAttributes(requestOptions) {
    const operation = this.getNodeParameter('operation', 0);
    const parameterName = operation === 'create'
        ? 'additionalFields.userAttributes.attributes'
        : 'userAttributes.attributes';
    const attributes = this.getNodeParameter(parameterName, []);
    if (operation === 'update' && (!attributes || attributes.length === 0)) {
        throw new NodeOperationError(this.getNode(), 'No user attributes provided', {
            description: 'At least one user attribute must be provided for the update operation.',
        });
    }
    if (operation === 'create') {
        const hasEmail = attributes.some((a) => a.standardName === 'email');
        const hasEmailVerified = attributes.some((a) => a.standardName === 'email_verified' && a.value === 'true');
        if (hasEmailVerified && !hasEmail) {
            throw new NodeOperationError(this.getNode(), 'Missing required "email" attribute', {
                description: '"email_verified" is set to true, but the corresponding "email" attribute is not provided.',
            });
        }
        const hasPhone = attributes.some((a) => a.standardName === 'phone_number');
        const hasPhoneVerified = attributes.some((a) => a.standardName === 'phone_number_verified' && a.value === 'true');
        if (hasPhoneVerified && !hasPhone) {
            throw new NodeOperationError(this.getNode(), 'Missing required "phone_number" attribute', {
                description: '"phone_number_verified" is set to true, but the corresponding "phone_number" attribute is not provided.',
            });
        }
    }
    const body = jsonParse(String(requestOptions.body), {
        acceptJSObject: true,
        errorMessage: 'Invalid request body. Request body must be valid JSON.',
    });
    body.UserAttributes = attributes.map(({ attributeType, standardName, customName, value }) => {
        if (!value || !attributeType || !(standardName ?? customName)) {
            throw new NodeOperationError(this.getNode(), 'Invalid User Attribute', {
                description: 'Each attribute must have a valid name and value.',
            });
        }
        const attributeName = attributeType === 'standard'
            ? standardName
            : `custom:${customName?.startsWith('custom:') ? customName : customName}`;
        return { Name: attributeName, Value: value };
    });
    requestOptions.body = JSON.stringify(body);
    return requestOptions;
}
export async function preSendDesiredDeliveryMediums(requestOptions) {
    const desiredDeliveryMediums = this.getNodeParameter('additionalFields.desiredDeliveryMediums', []);
    const attributes = this.getNodeParameter('additionalFields.userAttributes.attributes', []);
    const hasEmail = attributes.some((attr) => attr.standardName === 'email' && !!attr.value?.trim());
    const hasPhone = attributes.some((attr) => attr.standardName === 'phone_number' && !!attr.value?.trim());
    if (desiredDeliveryMediums.includes('EMAIL') && !hasEmail) {
        throw new NodeOperationError(this.getNode(), 'Missing required "email" attribute', {
            description: 'Email is selected as a delivery medium but no email attribute is provided.',
        });
    }
    if (desiredDeliveryMediums.includes('SMS') && !hasPhone) {
        throw new NodeOperationError(this.getNode(), 'Missing required "phone_number" attribute', {
            description: 'SMS is selected as a delivery medium but no phone_number attribute is provided.',
        });
    }
    return requestOptions;
}
//# sourceMappingURL=utils.js.map