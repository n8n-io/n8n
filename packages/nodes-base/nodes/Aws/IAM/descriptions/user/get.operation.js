import { updateDisplayOptions } from 'n8n-workflow';
import { userLocator } from '../common';
const properties = [
    {
        ...userLocator,
        description: 'Select the user you want to retrieve',
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