import { NodeApiError, updateDisplayOptions } from 'n8n-workflow';
import { validateArn } from '../../helpers/utils';
import { groupResourceLocator, userPoolResourceLocator } from '../common.description';
const properties = [
    {
        ...userPoolResourceLocator,
        description: 'Select the user pool to use',
    },
    {
        ...groupResourceLocator,
        description: 'Select the group you want to update',
    },
    {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        placeholder: 'Add Option',
        type: 'collection',
        default: {},
        routing: {
            send: {
                preSend: [
                    async function (requestOptions) {
                        const additionalFields = this.getNodeParameter('additionalFields', {});
                        const arn = additionalFields.arn;
                        const description = additionalFields.description;
                        const precedence = additionalFields.precedence;
                        if (!description && !precedence && !arn) {
                            throw new NodeApiError(this.getNode(), {
                                message: 'At least one field must be provided for update.',
                                description: 'Please provide a value for Description, Precedence, or Role ARN.',
                            });
                        }
                        return requestOptions;
                    },
                ],
            },
        },
        options: [
            {
                displayName: 'Description',
                name: 'description',
                default: '',
                placeholder: 'e.g. Updated group description',
                description: 'A new description for the group',
                type: 'string',
                routing: {
                    send: {
                        type: 'body',
                        property: 'Description',
                    },
                },
            },
            {
                displayName: 'Precedence',
                name: 'precedence',
                default: '',
                placeholder: 'e.g. 10',
                description: 'The new precedence value for the group. Lower values indicate higher priority.',
                type: 'number',
                routing: {
                    send: {
                        type: 'body',
                        property: 'Precedence',
                    },
                },
                validateType: 'number',
            },
            {
                displayName: 'Role ARN',
                name: 'arn',
                default: '',
                placeholder: 'e.g. arn:aws:iam::123456789012:role/GroupRole',
                description: 'A new role Amazon Resource Name (ARN) for the group. Used for setting claims in tokens.',
                type: 'string',
                routing: {
                    send: {
                        type: 'body',
                        property: 'Arn',
                        preSend: [validateArn],
                    },
                },
            },
        ],
    },
];
const displayOptions = {
    show: {
        resource: ['group'],
        operation: ['update'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
//# sourceMappingURL=update.operation.js.map