import { updateDisplayOptions } from 'n8n-workflow';
import { groupResourceLocator, userPoolResourceLocator } from '../common.description';
const properties = [
    {
        ...userPoolResourceLocator,
        description: 'Select the user pool to use',
    },
    {
        ...groupResourceLocator,
        description: 'Select the group you want to delete',
    },
];
const displayOptions = {
    show: {
        resource: ['group'],
        operation: ['delete'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
//# sourceMappingURL=delete.operation.js.map