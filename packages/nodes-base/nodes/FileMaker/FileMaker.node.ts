import {IExecuteFunctions} from 'n8n-core';
import {
    IDataObject,
    ILoadOptionsFunctions,
    INodeExecutionData, INodePropertyOptions,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';


import {OptionsWithUri} from 'request';
import {layoutsApiRequest, getFields, getToken, logout} from "./GenericFunctions";

export class FileMaker implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'FileMaker',
        name: 'filemaker',
        icon: 'file:filemaker.png',
        group: ['input'],
        version: 1,
        description: 'Retrieve data from FileMaker data API.',
        defaults: {
            name: 'FileMaker',
            color: '#665533',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'FileMaker',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Action',
                name: 'action',
                type: 'options',
                options: [
                    /*{
                        name: 'Login',
                        value: 'login',
                    },
                    {
                        name: 'Logout',
                        value: 'logout',
                    },*/
                    {
                        name: 'Find Records',
                        value: 'find',
                    },
                    {
                        name: 'get Records',
                        value: 'records',
                    },
                    {
                        name: 'Get Records By Id',
                        value: 'record',
                    },
                    {
                        name: 'Perform Script',
                        value: 'performscript',
                    },
                    {
                        name: 'Create Record',
                        value: 'create',
                    },
                    {
                        name: 'Edit Record',
                        value: 'edit',
                    },
                    {
                        name: 'Duplicate Record',
                        value: 'duplicate',
                    },
                    {
                        name: 'Delete Record',
                        value: 'delete',
                    },
                ],
                default: 'login',
                description: 'Action to perform.',
            },

            // ----------------------------------
            //         shared
            // ----------------------------------
            {
                displayName: 'Layout',
                name: 'layout',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'getLayouts',
                },
                options: [],
                default: '',
                required: true,
                displayOptions: {
                    hide: {
                        action: [
                            'performscript'
                        ],
                    },
                },
                placeholder: 'Layout Name',
                description: 'FileMaker Layout Name.',
            },
            {
                displayName: 'Record Id',
                name: 'recid',
                type: 'number',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        action: [
                            'record',
                            'edit',
                            'delete',
                            'duplicate',
                        ],
                    },
                },
                placeholder: 'Record ID',
                description: 'Internal Record ID returned by get (recordid)',
            },
            // ----------------------------------
            //         find/records
            // ----------------------------------
            {
                displayName: 'offset',
                name: 'offset',
                placeholder: '0',
                description: 'The record number of the first record in the range of records.',
                type: 'number',
                default: '1',
                displayOptions: {
                    show: {
                        action: [
                            'find',
                            'records',
                        ],
                    },
                }
            },
            {
                displayName: 'limit',
                name: 'limit',
                placeholder: '100',
                description: 'The maximum number of records that should be returned. If not specified, the default value is 100.',
                type: 'number',
                default: '100',
                displayOptions: {
                    show: {
                        action: [
                            'find',
                            'records',
                        ],
                    },
                }
            },
            {
                displayName: 'Sort',
                name: 'sortParametersUi',
                placeholder: 'Add Sort Rules',
                type: 'fixedCollection',
                typeOptions: {
                    multipleValues: true,
                },
                displayOptions: {
                    show: {
                        action: [
                            'find',
                            'records',
                        ],
                    },
                },
                description: 'Sort rules',
                default: {},
                options: [
                    {
                        name: 'rules',
                        displayName: 'Rules',
                        values: [
                            {
                                displayName: 'Name',
                                name: 'name',
                                type: 'options',
                                default: '',
                                typeOptions: {
                                    loadOptionsMethod: 'getFields',
                                },
                                options: [],
                                description: 'Field Name.',
                            },
                            {
                                displayName: 'Value',
                                name: 'value',
                                type: 'options',
                                default: 'ascend',
                                options: [
                                    {
                                        name: 'Ascend',
                                        value: 'ascend'
                                    },
                                    {
                                        name: 'Descend',
                                        value: 'descend'
                                    },
                                ],
                                description: 'Sort order.',
                            },
                        ]
                    },
                ],
            },
            // ----------------------------------
            //         create/edit
            // ----------------------------------
            {
                displayName: 'fieldData',
                name: 'fieldData',
                placeholder: '{"field1": "value", "field2": "value", ...}',
                description: 'Additional fields to add.',
                type: 'string',
                default: '{}',
                displayOptions: {
                    show: {
                        action: [
                            'create',
                            'edit',
                        ],
                    },
                }
            },
            {
                displayName: 'Fields',
                name: 'Fields',
                type: 'collection',
                typeOptions: {
                    loadOptionsMethod: 'getFields',
                },
                options: [],
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        action: [
                            'create',
                            'edit',
                        ],
                    },
                },
                placeholder: 'Layout Name',
                description: 'FileMaker Layout Name.',
            },
            // ----------------------------------
            //         performscript
            // ----------------------------------
            {
                displayName: 'Script Name',
                name: 'script',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'getScripts',
                },
                options: [],
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        action: [
                            'performscript'
                        ],
                    },
                },
                placeholder: 'Layout Name',
                description: 'FileMaker Layout Name.',
            },
        ]
    };

    methods = {
        loadOptions: {
            // Get all the available topics to display them to user so that he can
            // select them easily
            async getLayouts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                const returnData: INodePropertyOptions[] = [];
                let layouts;
                try {
                    layouts = await layoutsApiRequest.call(this);
                } catch (err) {
                    throw new Error(`FileMaker Error: ${err}`);
                }
                for (const layout of layouts) {
                    returnData.push({
                        name: layout.name,
                        value: layout.name,
                    });
                }
                return returnData;
            },

            async getFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                const returnData: INodePropertyOptions[] = [];

                let fields;
                try {
                    fields = await getFields.call(this);
                } catch (err) {
                    throw new Error(`FileMaker Error: ${err}`);
                }
                for (const field of fields) {
                    returnData.push({
                        name: field.name,
                        value: field.name,
                    });
                }
                return returnData;
            },
        },
    };


    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        const credentials = this.getCredentials('FileMaker');

        const action = this.getNodeParameter('action', 0) as string;

        if (credentials === undefined) {
            throw new Error('No credentials got returned!');
        }
        const staticData = this.getWorkflowStaticData('global');
        // Operations which overwrite the returned data
        const overwriteDataOperations = [];
        // Operations which overwrite the returned data and return arrays
        // and has so to be merged with the data of other items
        const overwriteDataOperationsArray = [];

        let requestOptions: OptionsWithUri;

        const host = credentials.host as string;
        const database = credentials.db as string;

        //const layout = this.getNodeParameter('layout', 0, null) as string;
        //const recid = this.getNodeParameter('recid', 0, null) as number;

        const url = `https://${host}/fmi/data/v1`;
        //const fullOperation = `${resource}:${operation}`;

        for (let i = 0; i < items.length; i++) {
            // Reset all values
            requestOptions = {
                uri: '',
                headers: {},
                method: 'GET',
                json: true
                //rejectUnauthorized: !this.getNodeParameter('allowUnauthorizedCerts', itemIndex, false) as boolean,
            };

            const layout = this.getNodeParameter('layout', 0) as string;
            const token = await getToken.call(this);

            if (action === 'record') {
                const recid = this.getNodeParameter('recid', 0) as string;

                requestOptions.uri = url + `/databases/${database}/layouts/${layout}/records/${recid}`;
                requestOptions.method = 'GET';
                requestOptions.headers = {
                    'Authorization': `Bearer ${token}`,
                };
            } else if (action === 'records') {
                requestOptions.uri = url + `/databases/${database}/layouts/${layout}/records`;
                requestOptions.method = 'GET';
                requestOptions.headers = {
                    'Authorization': `Bearer ${token}`,
                };

                const sort = [];
                const sortParametersUi =  this.getNodeParameter('sortParametersUi', 0, {}) as IDataObject;
                if (sortParametersUi.parameter !== undefined) {
                    // @ts-ignore
                    for (const parameterData of sortParametersUi!.rules as IDataObject[]) {
                        // @ts-ignore
                        sort.push({
                            'fieldName': parameterData!.name as string,
                            'sortOrder': parameterData!.value
                        });
                    }
                }
                requestOptions.qs = {
                    '_offset': this.getNodeParameter('offset', 0),
                    '_limit': this.getNodeParameter('limit', 0),
                    '_sort': JSON.stringify(sort),
                };
            } else {
                throw new Error(`The action "${action}" is not implemented yet!`);
            }

            // Now that the options are all set make the actual http request
            let response;
            try {
                response = await this.helpers.request(requestOptions);
            } catch (error) {
                response = error.response.body;
            }

            if (typeof response === 'string') {
                throw new Error('Response body is not valid JSON. Change "Response Format" to "String"');
            }
            await logout.call(this, token);

            returnData.push({json: response});
        }

        return this.prepareOutputData(returnData);
    }
}