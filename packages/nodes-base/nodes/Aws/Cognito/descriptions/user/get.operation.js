import { updateDisplayOptions } from 'n8n-workflow';
import { userPoolResourceLocator, userResourceLocator } from '../common.description';
const properties = [
    {
        ...userPoolResourceLocator,
        description: 'Select the user pool to use',
    },
    {
        ...userResourceLocator,
        description: 'Select the user you want to retrieve',
    },
    {
        displayName: 'Simplify',
        name: 'simple',
        type: 'boolean',
        default: true,
        description: 'Whether to return a simplified version of the response instead of the raw data',
    },
];
const displayOptions = {
    show: {
        resource: ['user'],
        operation: ['get'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
//# sourceMappingURL=get.operation.js.map