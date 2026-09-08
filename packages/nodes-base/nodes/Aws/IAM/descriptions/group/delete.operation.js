import { updateDisplayOptions } from 'n8n-workflow';
import { groupLocator } from '../common';
const properties = [
    {
        ...groupLocator,
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