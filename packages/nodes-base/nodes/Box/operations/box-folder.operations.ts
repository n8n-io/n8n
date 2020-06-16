import {
    INodeProperties,
} from 'n8n-workflow';

import {
    boxApiResourceType, folderApiParamType, boxApiResourceActionTypes
} from '../box.constants';

let listFolderProperties: INodeProperties[] = [
    {
        displayName: folderApiParamType.offset,
        name: folderApiParamType.offsetVal,
        type: 'number',
        default: 0,
        required: false,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.listVal
                ],
                resource: [
                    boxApiResourceType.folderVal
                ],
            },
        },
        description: 'The offset for the get folders api',
    },
    {
        displayName: folderApiParamType.limit,
        name: folderApiParamType.limitVal,
        type: 'number',
        default: 0,
        required: false,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.listVal
                ],
                resource: [
                    boxApiResourceType.folderVal
                ],
            },
        },
        description: 'The offset for the get folders api',
    }
]

let addFolderProperties: INodeProperties[] = [
    {
        displayName: folderApiParamType.folderName,
        name: folderApiParamType.folderNameVal,
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.createVal
                ],
                resource: [
                    boxApiResourceType.folderVal
                ],
            },
        },
        description: 'Name of the folder to be created',
    },
    {
        displayName: folderApiParamType.folderUploadEmail,
        name: folderApiParamType.folderUploadEmailVal,
        type: 'options',
        default: '',
        required: false,
        options: [
            {
                name: 'None',
                value: '',
                description: 'None',
            },
            {
                name: 'Open',
                value: 'open',
                description: 'Users can email files to the email address that has been automatically created for this folder.',
            },
            {
                name: 'Collaborators',
                value: 'collaborators',
                description: 'Only emails from registered email addresses for collaborators will be accepted.',
            }
        ],
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.createVal
                ],
                resource: [
                    boxApiResourceType.folderVal
                ],
            },
        },
        description: 'This email address can be used by users to directly upload files directly to the folder via email.',
    },
    {
        displayName: folderApiParamType.folderParent,
        name: folderApiParamType.folderParentVal,
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.createVal
                ],
                resource: [
                    boxApiResourceType.folderVal
                ],
            },
        },
        description: 'Unique identifier of the parent folder',
    }
]

let copyFolderProperties: INodeProperties[] = [
    {
        displayName: folderApiParamType.currentFolder,
        name: folderApiParamType.currentFolderVal,
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.copyVal
                ],
                resource: [
                    boxApiResourceType.folderVal
                ],
            },
        },
        description: 'Unique identifier of the folder to copy.',
    },
    {
        displayName: folderApiParamType.folderName,
        name: folderApiParamType.folderNameVal,
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.copyVal
                ],
                resource: [
                    boxApiResourceType.folderVal
                ],
            },
        },
        description: 'An optional new name for the copied folder.',
    },
    {
        displayName: folderApiParamType.folderParent,
        name: folderApiParamType.folderParentVal,
        type: 'string',
        default: '',
        required: false,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.copyVal
                ],
                resource: [
                    boxApiResourceType.folderVal
                ],
            },
        },
        description: 'Unique Identifier of the destination folder to copy the folder to.',
    }
]

let modifyFolderProperties: INodeProperties[] = [
    {
        displayName: folderApiParamType.currentFolder,
        name: folderApiParamType.currentFolderVal,
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.modifyVal
                ],
                resource: [
                    boxApiResourceType.folderVal
                ],
            },
        },
        description: 'Unique identifier of the folder to Modify.',
    },
    {
        displayName: folderApiParamType.folderParent,
        name: folderApiParamType.folderParentVal,
        type: 'string',
        default: '',
        required: false,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.modifyVal
                ],
                resource: [
                    boxApiResourceType.folderVal
                ],
            },
        },
        description: 'Unique Identifier of the destination folder to copy the folder to.',
    },
    {
        displayName: folderApiParamType.folderName,
        name: folderApiParamType.folderNameVal,
        type: 'string',
        default: '',
        required: false,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.modifyVal
                ],
                resource: [
                    boxApiResourceType.folderVal
                ],
            },
        },
        description: 'Folder name',
    },
    {
        displayName: folderApiParamType.folderDescription,
        name: folderApiParamType.folderDescriptionVal,
        type: 'string',
        default: '',
        required: false,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.modifyVal
                ],
                resource: [
                    boxApiResourceType.folderVal
                ],
            },
        },
        description: 'Folder description',
    },
    {
        displayName: folderApiParamType.folderUploadEmail,
        name: folderApiParamType.folderUploadEmailVal,
        type: 'options',
        default: '',
        required: false,
        options: [
            {
                name: 'None',
                value: '',
                description: 'None',
            },
            {
                name: 'Open',
                value: 'open',
                description: 'Users can email files to the email address that has been automatically created for this folder.',
            },
            {
                name: 'Collaborators',
                value: 'collaborators',
                description: 'Only emails from registered email addresses for collaborators will be accepted.',
            }
        ],
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.modifyVal
                ],
                resource: [
                    boxApiResourceType.folderVal
                ],
            },
        },
        description: 'This email address can be used by users to directly upload files directly to the folder via email.',
    }
]

let deleteFolderProperties: INodeProperties[] = [
    {
        displayName: folderApiParamType.currentFolder,
        name: folderApiParamType.currentFolderVal,
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.deleteVal
                ],
                resource: [
                    boxApiResourceType.folderVal
                ],
            },
        },
        description: 'Unique identifier of the folder to Delete.',
    },
    {
        displayName: folderApiParamType.recursive,
        name: folderApiParamType.recursiveVal,
        type: 'boolean',
        default: false,
        required: false,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.deleteVal
                ],
                resource: [
                    boxApiResourceType.folderVal
                ],
            },
        },
        description: 'Recursively delete children',
    }
]

export const boxFolderOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        displayOptions: {
            show: {
                resource: [
                    boxApiResourceType.folderVal
                ],
            },
        },
        options: [
            {
                name: boxApiResourceActionTypes.copy,
                value: boxApiResourceActionTypes.copyVal,
                description: 'Copy a folder',
            },
            {
                name: boxApiResourceActionTypes.create,
                value: boxApiResourceActionTypes.createVal,
                description: 'Create a folder',
            },
            {
                name: boxApiResourceActionTypes.delete,
                value: boxApiResourceActionTypes.deleteVal,
                description: 'Delete a folder',
            },
            {
                name: boxApiResourceActionTypes.list,
                value: boxApiResourceActionTypes.listVal,
                description: 'Return the files and folders in a given folder',
            },
            {
                name: boxApiResourceActionTypes.modify,
                value: boxApiResourceActionTypes.modifyVal,
                description: 'Modify/Move a folder',
            }
        ],
        default: boxApiResourceActionTypes.listVal,
        description: 'The operation to perform.',
    },
    ...listFolderProperties,
    ...addFolderProperties,
    ...copyFolderProperties,
    ...modifyFolderProperties,
    ...deleteFolderProperties
] as INodeProperties[];