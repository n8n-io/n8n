import {
    BINARY_ENCODING,
    IExecuteFunctions,
} from 'n8n-core';

import {
    IDataObject,
    INodeExecutionData,
    INodeParameters,
    INodeType,
    INodeTypeDescription,
    IBinaryData,
    NodeOperationError,
} from 'n8n-workflow';

import {
    OptionsWithUri,
} from 'request';

import {
    queryOperations,
    queryFields,
} from './Query'

import {
    objectOperations,
    objectFields,
} from './Object'

import {
    generalFields,
} from './General'

import {
    mergeObjectProperties,
} from './GenericFunctions'

import { updateDatapoint } from '../Beeminder/Beeminder.node.functions';



export class FakturBoxArchive implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'faktur:box Archive',
        name: 'faktur:box Archive', // Note for review: CI is faktur:box, please check https://fakturdigital.de/
        icon: 'file:fakturBox.svg',
				subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        group: ['transform'],
        version: 1,
        description: 'Consume faktur:box Archive API',
        defaults: {
            name: 'faktur:box Archive',
						description:'Consume faktur:box Archive API',
            color: '#1A82e2',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'FakturBoxArchiveApi',
                required: true,
            },
        ],
        properties: [
            // Node properties which the user gets displayed and
            // can change on the node.
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                options: [
                    {
                        name: 'Info',
                        value: 'info',
                    },
                    {
                        name: 'General',
                        value: 'general',
                    },
                    {
                        name: 'Object',
                        value: 'object',
                    },
                    {
                        name: 'Query',
                        value: 'query'
                    },
                ],
                default: 'info',
                required: true,
                description: 'Kategorie der API'
            },

            ...queryOperations,
            ...queryFields,
            ...objectOperations,
            ...objectFields,
            ...generalFields,

            {
                displayName: 'Options',
                name: 'options',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                displayOptions: {
                    show: {
                        resource: [
                            'object',
                            'info',
                            'general',
                            'query',
                        ],
                    },
                },
                options: [
                    {
                        displayName: 'Simplify Output',
                        name: 'simple',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to return a simplified version of the response instead of the raw data',
                        displayOptions: {
                            show: {
                                '/operation': [
                                    'getobjectproperties',
                                ],
                            },
                        },
                    },
                    {
                        displayName: 'Use Different Session GUID',
                        name: 'diff_session',
                        type: 'string',
                        default: '',
                        description: 'This session GUID is used instead of the one configured in the credentials',
                    },
                    {
                        displayName: 'VersionNumber',
                        name: 'versionnumber',
                        type: 'collection',
                        default: {},
                        displayOptions: {
                            show: {
                                '/operation': [
                                    'uploadnewversion'
                                ],
                            },
                        },
                        options: [
                            {
                                displayName: 'VersionIncrementStyle',
                                name: 'versionincrementstyle',
                                type: 'options',
                                default: 0,
                                required: true,
                                options: [
                                    {
                                        name: 'IncrementMajor',
                                        value: 10
                                    },
                                    {
                                        name: 'IncrementMinor',
                                        value: 11
                                    },
                                    {
                                        name: 'IncrementRevision',
                                        value: 12
                                    },
																		{
																			name: 'NoVersionIncrement',
																			value: 0
																	  },
                                    {
                                        name: 'SpecifyVersionNumber',
                                        value: 13
                                    },
                                ],
                            },
														{
															displayName: 'VersionLabel',
															name: 'versionlabel',
															type: 'string',
															default: '',
													 },
                            {
                                displayName: 'VersionMajor',
                                name: 'versionmajor',
                                required: true,
                                type: 'number',
                                default: 0,
                            },
                            {
                                displayName: 'VersionMinor',
                                name: 'versionminor',
                                type: 'number',
                                default: 0,
                            },
                            {
                                displayName: 'VersionRevision',
                                name: 'versionrevision',
                                type: 'number',
                                default: 0,
                            },

                        ],
                    },
                ]
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData = []
        let responseData;
        const resource = this.getNodeParameter('resource', 0) as string;
        const options = this.getNodeParameter('options', 0) as IDataObject;
        var operation = undefined;
        try {
            operation = this.getNodeParameter('operation', 0) as string;
        } catch (error) {

        }

        const credentials = await this.getCredentials('FakturBoxArchiveApi') as IDataObject;

        if (credentials === undefined) {
            throw new NodeOperationError(this.getNode(), 'Failed to get credentials!');
        }

        let base_uri: string = `${credentials.url}`
        let my_session: string = `${credentials.sessionguid}`

        if (!base_uri.endsWith('/')) {
            base_uri = base_uri + '/';
        }

        if (options.diff_session != undefined) {
            if (options.diff_session != '') {
                //console.log('Using alternative session Guid')
                my_session = options.diff_session as string;
            }
        }

        interface IKeys {
            [key: string]: any,
        }

        for (let i = 0; i < items.length; i++) {
					try {
            if (resource === 'info') {
                const options: OptionsWithUri = {
                    method: 'POST',
                    body: {
                        'format': 'json'
                    },
                    uri: base_uri + 'info',
                    json: true,
                };

                responseData = await this.helpers.request(options)
                returnData.push(responseData);
            }

            if (resource === 'general') {
                const values = this.getNodeParameter('values', i) as IDataObject;
                const endpoint = this.getNodeParameter('endpoint', i) as IDataObject;

                const data: IDataObject = {
                    sessionguid: my_session,
                };

                //console.log(data);

                (this.getNodeParameter('values.string', i, []) as INodeParameters[]).forEach((setItem: any) => {
                    data[setItem.name] = setItem.value;
                });
                (this.getNodeParameter('values.number', i, []) as INodeParameters[]).forEach((setItem: any) => {
                    data[setItem.name] = setItem.value;
                });
                (this.getNodeParameter('values.boolean', i, []) as INodeParameters[]).forEach((setItem: any) => {
                    data[setItem.name] = setItem.value;
                });

                //console.log(data);

                const options: OptionsWithUri = {
                    method: 'POST',
                    body: data,
                    uri: base_uri + endpoint,
                    json: true,
                };

                responseData = await this.helpers.request(options)
                returnData.push(responseData);
            }

            if (resource === 'query') {

                /* ******************************************************* */
                /* GET QUERY RESULTSET */
                /* ******************************************************* */

                if (operation === 'getqueryresultset') {
                    const pagesize = this.getNodeParameter('pagesize', i) as string;
                    const pagenumber = this.getNodeParameter('pagenumber', i) as string;
                    const querydetails = this.getNodeParameter('querydetails', i) as string;

                    const data: IDataObject = {
                        pagenumber,
                        pagesize,
                        querydetails,
                        sessionguid: my_session,
                    }

                    const options: OptionsWithUri = {

                        method: 'POST',
                        body: data,
                        uri: base_uri + operation,
                        json: true,
                    }

                    responseData = await this.helpers.request(options)
                    returnData.push(responseData);
                }

                /* ******************************************************* */
                /* GET SAVED QUERIES */
                /* ******************************************************* */

                if (operation == 'getsavedqueries') {
                    const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

                    const data: IDataObject = {
                        sessionguid: my_session
                    }


                    Object.assign(data, additionalFields)

                    const options: OptionsWithUri = {
                        method: 'POST',
                        body: data,
                        uri: base_uri + operation,
                        json: true,
                    };

                    responseData = await this.helpers.request(options)
                    returnData.push(responseData);
                }
            }

            if (resource === 'object') {

                /* ******************************************************* */
                /* SET DELETE FLAG */
                /* ******************************************************* */

                if (operation == 'setdeleteflag') {
                    const obj_id = this.getNodeParameter('objectid', i) as number;
                    //console.log(obj_id)
                    const delete_reason = this.getNodeParameter('deletereason', i) as number;
                    //console.log(delete_reason)
                    const include_subitems = this.getNodeParameter('includesubitems', i) as boolean;
                    //console.log(include_subitems)
                    const delete_reason_text = this.getNodeParameter('deletereasontext', i) as string;
                    //console.log(delete_reason_text)

                    const body_data: IDataObject = {
                        deleteflagelements: {
                            objectid: obj_id,
                            deletereason: delete_reason,
                            includesubitems: include_subitems,
                            deletereasontext: delete_reason_text,
                        },
                        sessionguid: my_session,
                    }

                    const options_delete: OptionsWithUri = {
                        method: 'POST',
                        body: body_data,
                        uri: base_uri + 'setdeleteflag',
                        json: true,
                    }

                    responseData = await this.helpers.request(options_delete)
                    return [this.helpers.returnJsonArray(responseData)]
                }

                /* ******************************************************* */
                /* CREATE OBEJECT */
                /* ******************************************************* */

                if (operation == 'createobject') {
                    let binarydataname: string = '';
                    const obj_name = this.getNodeParameter('objname', i) as string;
                    const obj_parent = this.getNodeParameter('objparent', i) as number;
                    const obj_type = this.getNodeParameter('objtype', i) as number;
                    const object_properties = this.getNodeParameter('properties', i) as IDataObject;
                    const uploadversion = this.getNodeParameter('uploadversion', i) as boolean;

                    try {
                        binarydataname = this.getNodeParameter('binarydata', i) as string;
                    } catch (error) {
                    }

                    let responseData_get;
                    //console.log(object_properties)

                    const body_data_get: IDataObject = {
                        sessionguid: my_session,
                        purpose: 'NewObject',
                        objecttypeid: obj_type,
                    }
                    //console.log(body_data_get)

                    const options_get: OptionsWithUri = {
                        method: 'POST',
                        body: body_data_get,
                        uri: base_uri + 'getobjectproperties',
                        json: true,
                    };

                    responseData_get = await this.helpers.request(options_get);

                    let propertyList = responseData_get['ObjectPropertyList'];

                    propertyList.forEach(function (prop: { [key: string]: any }, index: number) {
                        if (prop.FieldName.toUpperCase() === 'OBJ_NAME'.toUpperCase()) {
                            prop['FieldValueString'] = obj_name;
                        }
                        if (prop.FieldName.toUpperCase() === 'OBJ_PARENTOBJECT'.toUpperCase()) {
                            prop['FieldValueNumeric'] = obj_parent;
                        }
                    })

                    const parameters = object_properties['parameter'] as INodeParameters[];
                    //console.log(parameters);

                    if (parameters.length > 0) {
                        parameters.forEach(function (item, index) {
                            //console.log(item.name)
                            propertyList.forEach(function (prop: { [key: string]: any }, index: number) {
                                if (item.name != undefined && item.value != undefined) {
                                    let valueField: string;
                                    if (prop.FieldName.toUpperCase() === item.name.toString().toUpperCase()) {
                                        switch (prop.FieldType) {
                                            case "N":
                                                valueField = 'FieldValueNumeric'
                                                break;
                                            case "S":
                                                valueField = 'FieldValueString'
                                                break;
                                            case "C":
                                                valueField = 'FieldValueCurrency'
                                                break;
                                            case "B":
                                                valueField = 'FieldValueBool'
                                                break;
                                            case "D":
                                                valueField = 'FieldValueDateTime'
                                                break;
                                            default:
                                                valueField = 'FieldValueString'
                                        }
                                        prop[valueField] = item.value.toString();
                                    }
                                }
                            })
                        })
                    }

                    const item = items[i];
                    let binaryProperty;

                    if (item.binary != undefined) {
                        binaryProperty = item.binary[binarydataname] as IBinaryData;
                        //console.log(binaryProperty)
                    }

                    let body_data_set: IDataObject = {};
                    body_data_set['ObjectPropertyList'] = propertyList;
                    body_data_set['sessionguid'] = my_session;

                    if (uploadversion == true && binaryProperty != undefined) {
                        body_data_set['VersionOriginalFilename'] = binaryProperty['fileName'];
                    }
                    //console.log(body_data_set)

                    const options_set: OptionsWithUri = {
                        method: 'POST',
                        body: body_data_set,
                        uri: base_uri + 'setobjectproperties',
                        json: true,
                    };

                    let responseData_set = await this.helpers.request(options_set);
                    let objid = responseData_set['ObjectPropertyList'].find((x: { FieldName: string; }) => x.FieldName === 'OBJ_OBJECTID').FieldValueNumeric

                    if (uploadversion == true && item.binary != undefined) {
                        if (item.binary[binarydataname] === undefined) {
                            throw new NodeOperationError(this.getNode(), `No binary data property "${binarydataname}" does not exists on item!`);
                        }
                        const binaryProperty = item.binary[binarydataname] as IBinaryData;
                        const options_fileupload: OptionsWithUri = {
                            method: 'POST',
                            body: {},
                            uri: base_uri + 'fileupload?guid=' + responseData_set.DocUploadGuid,
                            json: true,
                        };
                        options_fileupload.body['file'] = {
                            value: Buffer.from(binaryProperty.data, BINARY_ENCODING),
                            options: {
                                filename: binaryProperty.fileName,
                                contentType: binaryProperty.mimeType,
                            },
                        };
                        options_fileupload.formData = options_fileupload.body
                        delete options_fileupload.body

                        //console.log(options_fileupload)
                        responseData = await this.helpers.request(options_fileupload);
                    }
                    if (responseData == undefined) {
                        responseData = {}
                    }
                    responseData['ObjectId'] = objid;
                    returnData.push(responseData);
                }

                /* ******************************************************* */
                /* GET OBJECT */
                /* ******************************************************* */

                if (operation == 'getobject') {
                    const objectid = this.getNodeParameter('objectid', i) as string;
                    const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

                    const data: IDataObject = {
                        objectid,
                        sessionguid: my_session
                    }

                    Object.assign(data, additionalFields)

                    const options: OptionsWithUri = {
                        method: 'POST',
                        body: data,
                        uri: base_uri + operation,
                        json: true,
                    };

                    responseData = await this.helpers.request(options)
                    returnData.push(responseData);
                }

                /* ******************************************************* */
                /* GET OBJECT PROPERTIES */
                /* ******************************************************* */

                if (operation == 'getobjectproperties') {
                    const objectid = this.getNodeParameter('objectid', i) as string;
                    const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

                    var simply = undefined;
                    //console.log(options)
                    if (options.simple !== undefined) {
                        simply = options.simple as boolean;
                        //console.log(simply)
                    }

                    const data: IDataObject = {
                        objectid,
                        sessionguid: my_session
                    }

                    Object.assign(data, additionalFields)

                    const req_options: OptionsWithUri = {
                        method: 'POST',
                        body: data,
                        uri: base_uri + operation,
                        json: true,
                    };

                    responseData = await this.helpers.request(req_options)

                    if (simply == true) {
                        var simpleOutput = responseData['ObjectPropertyList'];
                        var newIt: IKeys = {};
                        simpleOutput.forEach(function (item: any, index: any) {
                            var property = item.FieldName;
                            var value: string = '';
                            switch (item.FieldType) {
                                case "N":
                                    value = item.FieldValueNumeric;
                                    if (value === undefined) {
                                        value = ''
                                    }
                                    break;
                                case "S":
                                    value = item.FieldValueString;
                                    if (value === undefined) {
                                        value = ''
                                    }
                                    break;
                                case "C":
                                    value = item.FieldValueCurrency;
                                    if (value === undefined) {
                                        value = ''
                                    }
                                    break;
                                case "B":
                                    value = item.FieldValueBool;
                                    if (value === undefined) {
                                        value = ''
                                    }
                                    break;
                                case "D":
                                    value = item.FieldValueDateTime;
                                    if (value === undefined) {
                                        value = ''
                                    }
                                    break;
                                default:
                                    value = '';
                                    break;
                            }
                            newIt[property] = value;
                            //Object.assign(newIt, {property: '1'});
                        });
                        //arr.push(newIt)
                        //responseData = arr;
                        returnData.push(newIt);
                    } else {
                        returnData.push(responseData);
                    }
                }

                /* ******************************************************* */
                /* UPLOAD NEW VERSION */
                /* ******************************************************* */

                if (operation == 'uploadnewversion') {
                    let binarydataname: string = '';
                    //console.log('uploadnewversion')
                    const objectid = this.getNodeParameter('objectid', i) as number;
                    //console.log(objectid);
                    const versioncomment = this.getNodeParameter('versioncomment', i) as string;
                    //console.log(versioncomment);
                    const properties = this.getNodeParameter('properties', i) as IDataObject;
                    //console.log(properties);
                    const versionexternalmetadata = this.getNodeParameter('versionexternalmetadata', i) as string;
                    //console.log(versionexternalmetadata)
                    const checkin = this.getNodeParameter('checkin', i) as boolean;
                    //console.log(checkin)
                    const appendtoprevious = this.getNodeParameter('appendtoprevious', i) as boolean;
                    //console.log(appendtoprevious)
                    var opts:any = {};
                    opts = this.getNodeParameter('options', i) as IDataObject;
                    //console.log(opts)

                    try {
                        binarydataname = this.getNodeParameter('binarydata_newversion', i) as string;
                    } catch (error) {
                    }

                    // getObjectProperties
                    //console.log('getObjectProperties');

                    let responseData_get;
                    //console.log(object_properties)

                    const body_data_get: IDataObject = {
                        sessionguid: my_session,
                        objectid: objectid,
                    }
                    //console.log(body_data_get)

                    const options_get: OptionsWithUri = {
                        method: 'POST',
                        body: body_data_get,
                        uri: base_uri + 'getobjectproperties',
                        json: true,
                    };

                    responseData_get = await this.helpers.request(options_get);

                    let propertyList = responseData_get['ObjectPropertyList'];
                    //console.log(propertyList);

                    const parameters = properties['parameter'] as INodeParameters[];
                    //console.log(parameters);
                    var new_properties = propertyList;
                    if (parameters != undefined) {
                        new_properties = await mergeObjectProperties(propertyList, parameters)
                    }

                    //console.log(new_properties)

                    // setObjectProperties
                    const body_data_set_objprops: IDataObject = {
                        objectpropertylist: new_properties,
                        objectid: objectid,
                        sessionguid: my_session,
                    }

                    const options_set_objprops: OptionsWithUri = {
                        method: 'POST',
                        body: body_data_set_objprops,
                        uri: base_uri + 'setobjectproperties',
                        json: true,
                    };

                    let responseData_set_objprops = await this.helpers.request(options_set_objprops);

                    //console.log(responseData_set_objprops)
                    if (!opts.hasOwnProperty('versionnumber')) {
                        opts.versionnumber = {};
                        opts.versionnumber.versionincrementstyle = 0;
                        opts.versionnumber.versionmajor = null;
                        opts.versionnumber.versionminor = null;
                        opts.versionnumber.versionrevision = null;
                        opts.versionnumber.versionlabel = '';
                    }


                    const item = items[i];
                    let binaryProperty;

                    if (item.binary != undefined) {
                        binaryProperty = item.binary[binarydataname] as IBinaryData;
                        //console.log(binaryProperty)
                    }

                    // set Version
                    if (binaryProperty != undefined) {
                        const body_data_set_version = {
                            sessionguid: my_session,
                            objectid: objectid,
                            checkin: checkin,
                            versionoriginalfilename: binaryProperty['fileName'],
                            versioncomment: versioncomment,
                            versionexternalmetadata: versionexternalmetadata,
                            versionnumber: {
                                versionincrementstyle: opts.versionnumber.versionincrementstyle,
                                versionmajor: opts.versionnumber.versionmajor,
                                versionminor: opts.versionnumber.versionminor,
                                versionrevision: opts.versionnumber.versionrevision,
                                versionlabel: opts.versionnumber.versionlabel,
                            },
                            appendtoprevious: appendtoprevious,
                          }
                        //console.log(body_data_set_version)

                        const options_set_version: OptionsWithUri = {
                            method: 'POST',
                            body: body_data_set_version,
                            uri: base_uri + 'setversion',
                            json: true,
                        };

                        responseData_get = await this.helpers.request(options_set_version);
                        //console.log(responseData_get);

                        let uploadguid = responseData_get.DocUploadGuid;

                        // Upload
                        if (item.binary != undefined) {
                            if (item.binary[binarydataname] === undefined) {
                                throw new NodeOperationError(this.getNode(), `No binary data property "${binarydataname}" does not exists on item!`);
                            }
                            const binaryProperty = item.binary[binarydataname] as IBinaryData;
                            const options_fileupload: OptionsWithUri = {
                                method: 'POST',
                                body: {},
                                uri: base_uri + 'fileupload?guid=' + uploadguid,
                                json: true,
                            };
                            options_fileupload.body['file'] = {
                                value: Buffer.from(binaryProperty.data, BINARY_ENCODING),
                                options: {
                                    filename: binaryProperty.fileName,
                                    contentType: binaryProperty.mimeType,
                                },
                            };
                            options_fileupload.formData = options_fileupload.body
                            delete options_fileupload.body

                            //console.log(options_fileupload)
                            responseData = await this.helpers.request(options_fileupload);

                            if (responseData.success == true) {

                                    const data: IDataObject = {
                                        objectid,
                                        sessionguid: my_session
                                    }

                                    const options: OptionsWithUri = {
                                        method: 'POST',
                                        body: data,
                                        uri: base_uri + "getobject",
                                        json: true,
                                    };

                                    let responseDataGetObject = await this.helpers.request(options)
                                    //console.log(responseDataGetObject.Latestversion)
                                    responseData.latestversion = responseDataGetObject.Latestversion
                                    returnData.push(responseDataGetObject);

                            }

                            returnData.push(responseData);
                        }
                    }
                }

                /* ******************************************************* */
                /* SET OBJECT PROPERTIES */
                /* ******************************************************* */
                if (operation == 'setobjectproperties') {
                    const objectid = this.getNodeParameter('objectid', i) as string;
                    const properties = this.getNodeParameter('properties', i) as IDataObject;
                    //console.log(properties);

                    if (properties.hasOwnProperty('parameter')) {
                        const parameters = properties['parameter'] as INodeParameters[];
                        if (parameters.length > 0) {
                            const data: IDataObject = {
                                objectid,
                                sessionguid: my_session
                            }

                            const req_options: OptionsWithUri = {
                                method: 'POST',
                                body: data,
                                uri: base_uri + 'getobjectproperties',
                                json: true,
                            };

                            let responseData_get = await this.helpers.request(req_options)
                            //console.log(responseData)

                            let propertyList = responseData_get['ObjectPropertyList'];
                            //console.log(propertyList);

                            let new_properties = propertyList;
                            new_properties = await mergeObjectProperties(propertyList, parameters);

                            const body_data_set_objprops: IDataObject = {
                                objectpropertylist: new_properties,
                                objectid: objectid,
                                sessionguid: my_session,
                            }

                            const options_set_objprops: OptionsWithUri = {
                                method: 'POST',
                                body: body_data_set_objprops,
                                uri: base_uri + 'setobjectproperties',
                                json: true,
                            };

                            let responseData_set_objprops = await this.helpers.request(options_set_objprops);
                            //console.log(responseData_set_objprops);
                            returnData.push(responseData_set_objprops);

                        } else {
                            throw new NodeOperationError(this.getNode(), `No properties specified!`);
                        }
                    } else {
                        throw new NodeOperationError(this.getNode(), `No properties specified!`);
                    }
                }
            }
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.toString() });
							continue;
						}

						throw error;
					}
        }
        return [this.helpers.returnJsonArray(returnData)];
    }
}
