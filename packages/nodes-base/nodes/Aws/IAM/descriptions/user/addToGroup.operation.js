import { updateDisplayOptions } from 'n8n-workflow';
import { groupLocator, userLocator } from '../common';
const properties = [
    {
        ...userLocator,
        description: 'Select the user you want to add to the group',
    },
    {
        ...groupLocator,
        description: 'Select the group you want to add the user to',
    },
];
const displayOptions = {
    show: {
        resource: ['user'],
        operation: ['addToGroup'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
//# sourceMappingURL=addToGroup.operation.js.map