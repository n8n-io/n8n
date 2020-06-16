import {
    INodeProperties,
} from 'n8n-workflow';

import {
    boxApiResourceType
} from './box.constants';

export const boxApiResources = [
    {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        options: [
            {
                name: boxApiResourceType.file,
                value: boxApiResourceType.fileVal,
            },
            {
                name: boxApiResourceType.folder,
                value: boxApiResourceType.folderVal,
            },
        ],
        default: boxApiResourceType.fileVal,
        description: 'The resources of box api to operate on.',
    }
] as INodeProperties[];
