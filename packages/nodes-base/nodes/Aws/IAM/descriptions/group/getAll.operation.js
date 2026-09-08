import { updateDisplayOptions } from 'n8n-workflow';
import { paginationParameters } from '../common';
const properties = [
    ...paginationParameters,
    {
        displayName: 'Include Users',
        name: 'includeUsers',
        type: 'boolean',
        default: false,
        description: 'Whether to include a list of users in the group',
    },
];
const displayOptions = {
    show: {
        resource: ['group'],
        operation: ['getAll'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
//# sourceMappingURL=getAll.operation.js.map