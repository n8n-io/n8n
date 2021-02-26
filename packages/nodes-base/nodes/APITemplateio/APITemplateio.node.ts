import {
    IExecuteFunctions,
} from 'n8n-core';

import {
    IDataObject,
    ILoadOptionsFunctions,
    INodePropertyOptions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';

import {
	apitemplateioApiRequest,
} from './GenericFunctions';


export class APITemplateio implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'APITemplate.io',
        name: 'apiTemplateio',
        icon: 'file:apiTemplateio.svg',
        group: ['transform'],
        version: 1,
        description: 'Consume APITemplate.io API',
        defaults: {
            name: 'APITemplateio',
            color: '#FFD051',
        },
        inputs: ['main'],
        outputs: ['main'],
		credentials: [
			{
				name: 'apiTemplateioApi',
				required: true,
			},
		],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                options: [
                    {
                        name: 'Create',
                        value: 'create',
                    } ,
                    {
                        name: 'Get Account Information',
                        value: 'get-account-information',
                    }                    
                ],
                default: 'create',
                required: true,
                description: 'Operation',
            },
            {
                displayName: 'Format',
                name: 'format',
                type: 'options',
                options: [
                    {
                        name: 'Image',
                        value: 'JPEG',
                    }  ,
                    {
                        name: 'PDF',
                        value: 'PDF',
                    }                                         
                ],
                displayOptions: {
                    show: {
                        operation: [
                            'create',
                        ],
                    },
                },                   
                default: 'JPEG',
                required: true,
                description: 'Operation',
            },            
            {
                displayName: 'Template ID',
                name: 'templateId',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'getTemplates',
                    loadOptionsDependsOn: [
                        'format',
                    ],                    
                },  
                displayOptions: {
                    show: {
                        operation: [
                            'create',
                        ],
                    },
                },                     
                required: true,
                default: '',
                description: '',
            },
            {
                displayName: 'Overrides',
                name: 'overrides',
                type: 'fixedCollection',
                typeOptions: {
                    multipleValues: true,
                },
                placeholder: 'Add Item',
                displayOptions: {
                    show: {
                        format: [
                            'JPEG',
                        ],
                        operation: [
                            'create',
                        ],
                    },
                },
                default: {},
                options: [
                    {
                        displayName: 'Values',
                        name: 'overridesValues',
                        values: [
                            {
                                displayName: 'Key',
                                name: 'key',
                                type: 'string',
                                default: '',
                                description: 'Key',
                            },
                            {
                                displayName: 'Value',
                                name: 'value',
                                type: 'string',
                                default: '',
                                description: 'Value',
                            },
                        ],
                    },
                ],
            },     
            {
                displayName: 'JSON',
                name: 'json',
                type: 'fixedCollection',
                typeOptions: {
                    multipleValues: true,
                },
                placeholder: 'Add Element',
                displayOptions: {
                    show: {
                        format: [
                            'PDF',
                        ],
                        operation: [
                            'create',
                        ],
                    },
                },
                default: {},
                options: [
                    {
                        displayName: 'Values',
                        name: 'values',
                        values: [
                            {
                                displayName: 'Key',
                                name: 'key',
                                type: 'string',
                                default: '',
                                description: 'Key',
                            },
                            {
                                displayName: 'Value',
                                name: 'value',
                                type: 'string',
                                default: '',
                                description: 'Value',
                            },
                        ],
                    },
                ],
            },                     
        ],
    };

    methods = {
		loadOptions: {
			async getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                // https://docs.apitemplate.io/reference/api-reference.html#list-templates
                const returnData: INodePropertyOptions[] = [];
                const format = this.getNodeParameter('format', 0) as string;
                const templates = await apitemplateioApiRequest.call(this,
                    { 
                        method: 'GET', 
                        resource: '/list-templates', //This endpoint creates a PDF file with JSON data and your template
                        query:{
                            format: format
                        }
                });
                
				for (const template of templates) {
					returnData.push({
						name: template.format+" - "+template.name+" ("+template.id+")",
						value: template.id,
					});
                }
                
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let results = null;
		
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
            if (operation === 'create') {
                const templateId = this.getNodeParameter('templateId', i) as string;
                const format = this.getNodeParameter('format', 0) as string;
                if (format === 'JPEG') {
                    // https://docs.apitemplate.io/reference/api-reference.html#create-an-image-jpeg-and-png
                    const overrides = (this.getNodeParameter('overrides', i) as IDataObject).overridesValues as IDataObject;
                    let body = {
                        overrides: overrides
                    };
                    results = await apitemplateioApiRequest.call(this,
                        { 
                            method: 'POST', 
                            resource: '/n8n/create_image', //This endpoint creates a JPEG file(along with PNG) with JSON data and your template
                            query:{
                                template_id: templateId
                            },
                            body: body
                    });
                    returnData.push(results);
                }else if(format === 'PDF'){
                    // https://docs.apitemplate.io/reference/api-reference.html#create-a-pdf
                    const values = (this.getNodeParameter('json', i) as IDataObject).values as IDataObject;
                    let body = {
                        list: values
                    };
                    results = await apitemplateioApiRequest.call(this,
                        { 
                            method: 'POST', 
                            resource: '/n8n/create_pdf',
                            query:{
                                template_id: templateId
                            },
                            body: body
                    });
                    returnData.push(results);                    
                }
            }else if (operation=='get-account-information'){
                results = await apitemplateioApiRequest.call(this,
                    { 
                        method: 'GET', 
                        resource: '/account-information'
                });
                returnData.push(results);
            }

		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
 