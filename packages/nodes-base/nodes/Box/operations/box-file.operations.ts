import {
    INodeProperties,
} from 'n8n-workflow';

import {
    boxApiResourceType, folderApiParamType, fileApiParamType, boxApiResourceActionTypes
} from '../box.constants';

let downloadFileProperties: INodeProperties[] = [
    {
        displayName: fileApiParamType.currentFile,
        name: fileApiParamType.currentFileVal,
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.downloadVal
                ],
                resource: [
                    boxApiResourceType.fileVal
                ],
            },
        },
        description: 'Unique identifier of the file to download.',
    },
    {
        displayName: fileApiParamType.binaryProperty,
        name: fileApiParamType.binaryPropertyVal,
        type: 'string',
        required: true,
        default: 'data',
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.downloadVal
                ],
                resource: [
                    boxApiResourceType.fileVal
                ],
            },
        },
        description: 'Name of the binary property to which to<br />write the data of the read file.',
    }
]

let copyFileProperties: INodeProperties[] = [
    {
        displayName: fileApiParamType.currentFile,
        name: fileApiParamType.currentFileVal,
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.copyVal
                ],
                resource: [
                    boxApiResourceType.fileVal
                ],
            },
        },
        description: 'Unique identifier of the file to copy.',
    },
    {
        displayName: fileApiParamType.folder,
        name: fileApiParamType.folderVal,
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.copyVal
                ],
                resource: [
                    boxApiResourceType.fileVal
                ],
            },
        },
        description: 'Id of the target folder',
    },
    {
        displayName: fileApiParamType.fileName,
        name: fileApiParamType.fileNameVal,
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.copyVal
                ],
                resource: [
                    boxApiResourceType.fileVal
                ],
            },
        },
        description: 'Name of the file post copy',
    },
    {
        displayName: fileApiParamType.fileVersion,
        name: fileApiParamType.fileVersionVal,
        type: 'string',
        required: false,
        default: '',
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.copyVal
                ],
                resource: [
                    boxApiResourceType.fileVal
                ],
            },
        },
        description: 'Version of the file post copy',
    }
]

let modifyFileProperties: INodeProperties[] = [
    {
        displayName: fileApiParamType.currentFile,
        name: fileApiParamType.currentFileVal,
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.modifyVal
                ],
                resource: [
                    boxApiResourceType.fileVal
                ],
            },
        },
        description: 'Unique identifier of the file to modify.',
    },
    {
        displayName: fileApiParamType.folder,
        name: fileApiParamType.folderVal,
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.modifyVal
                ],
                resource: [
                    boxApiResourceType.fileVal
                ],
            },
        },
        description: 'Id of the parent folder',
    },
    {
        displayName: fileApiParamType.fileName,
        name: fileApiParamType.fileNameVal,
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.modifyVal
                ],
                resource: [
                    boxApiResourceType.fileVal
                ],
            },
        },
        description: 'Name of the file',
    },
    {
        displayName: fileApiParamType.fileDescription,
        name: fileApiParamType.fileDescriptionVal,
        type: 'string',
        required: false,
        default: '',
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.modifyVal
                ],
                resource: [
                    boxApiResourceType.fileVal
                ],
            },
        },
        description: 'Description of the file',
    }
]

let deleteFileProperties: INodeProperties[] = [
    {
        displayName: fileApiParamType.currentFile,
        name: fileApiParamType.currentFileVal,
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.deleteVal
                ],
                resource: [
                    boxApiResourceType.fileVal
                ],
            },
        },
        description: 'Unique identifier of the file to delete.',
    }
]

let uploadFileProperties: INodeProperties[] = [
    {
        displayName: fileApiParamType.filePath,
        name: fileApiParamType.filePathVal,
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.uploadVal
                ],
                resource: [
                    boxApiResourceType.fileVal
                ],
            },
        },
        placeholder: '/invoices/2019/invoice_1.pdf',
        description: 'The local path of the file.',
    },
    {
        displayName: fileApiParamType.fileName,
        name: fileApiParamType.fileNameVal,
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.uploadVal
                ],
                resource: [
                    boxApiResourceType.fileVal
                ],
            },
        },
        description: 'File name of the file.',
    },
    {
        displayName: fileApiParamType.contentType,
        name: fileApiParamType.contentTypeVal,
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.uploadVal
                ],
                resource: [
                    boxApiResourceType.fileVal
                ],
            },
        },
        description: 'Content type of the file.',
    },
    {
        displayName: fileApiParamType.folder,
        name: fileApiParamType.folderVal,
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.uploadVal
                ],
                resource: [
                    boxApiResourceType.fileVal
                ],
            },
        },
        description: 'Id of the target folder',
    },
    {
        displayName: fileApiParamType.binaryData,
        name: fileApiParamType.binaryDataVal,
        type: 'boolean',
        default: false,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.uploadVal
                ],
                resource: [
                    boxApiResourceType.fileVal
                ],
            },
        },
        description: 'If the data to upload should be taken from binary field.',
    },
    {
        displayName: fileApiParamType.binaryProperty,
        name: fileApiParamType.binaryPropertyVal,
        type: 'string',
        default: 'data',
        required: true,
        displayOptions: {
            show: {
                operation: [
                    boxApiResourceActionTypes.uploadVal
                ],
                resource: [
                    boxApiResourceType.fileVal
                ],
                binaryData: [
                    true
                ],
            },

        },
        placeholder: '',
        description: 'Name of the binary property which contains<br />the data for the file to be uploaded.',
    },
]

export const boxFileOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        displayOptions: {
            show: {
                resource: [
                    boxApiResourceType.fileVal
                ],
            },
        },
        options: [
            {
                name: boxApiResourceActionTypes.copy,
                value: boxApiResourceActionTypes.copyVal,
                description: 'Copy a file',
            },
            {
                name: boxApiResourceActionTypes.upload,
                value: boxApiResourceActionTypes.uploadVal,
                description: 'Upload a file',
            },
            {
                name: boxApiResourceActionTypes.delete,
                value: boxApiResourceActionTypes.deleteVal,
                description: 'Delete a file',
            },
            {
                name: boxApiResourceActionTypes.modify,
                value: boxApiResourceActionTypes.modifyVal,
                description: 'Modify a file',
            },
            {
                name: boxApiResourceActionTypes.download,
                value: boxApiResourceActionTypes.downloadVal,
                description: 'Download a file',
            },
        ],
        default: boxApiResourceActionTypes.uploadVal,
        description: 'The operation to perform.'
    },
    ...downloadFileProperties,
    ...copyFileProperties,
    ...modifyFileProperties,
    ...deleteFileProperties,
	...uploadFileProperties

] as INodeProperties[];
