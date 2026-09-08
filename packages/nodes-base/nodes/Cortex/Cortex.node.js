import * as changeCase from 'change-case';
import { createHash } from 'crypto';
import upperFirst from 'lodash/upperFirst';
import { NodeConnectionTypes } from 'n8n-workflow';
import { analyzerFields, analyzersOperations } from './AnalyzerDescriptions';
import { cortexApiRequest, getEntityLabel, prepareParameters, splitTags } from './GenericFunctions';
import { jobFields, jobOperations } from './JobDescription';
import { responderFields, respondersOperations } from './ResponderDescription';
export class Cortex {
    description = {
        displayName: 'Cortex',
        name: 'cortex',
        icon: 'file:cortex.svg',
        group: ['transform'],
        subtitle: '={{$parameter["operation"]+ ": " + $parameter["resource"]}}',
        version: 1,
        description: 'Apply the Cortex analyzer/responder on the given entity',
        defaults: {
            name: 'Cortex',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'cortexApi',
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
                noDataExpression: true,
                options: [
                    {
                        name: 'Analyzer',
                        value: 'analyzer',
                    },
                    {
                        name: 'Job',
                        value: 'job',
                    },
                    {
                        name: 'Responder',
                        value: 'responder',
                    },
                ],
                default: 'analyzer',
                description: 'Choose a resource',
                required: true,
            },
            ...analyzersOperations,
            ...analyzerFields,
            ...respondersOperations,
            ...responderFields,
            ...jobOperations,
            ...jobFields,
        ],
    };
    methods = {
        loadOptions: {
            async loadActiveAnalyzers() {
                // request the enabled analyzers from instance
                const requestResult = await cortexApiRequest.call(this, 'POST', '/analyzer/_search?range=all');
                const returnData = [];
                for (const analyzer of requestResult) {
                    returnData.push({
                        name: analyzer.name,
                        value: `${analyzer.id}::${analyzer.name}`,
                        description: analyzer.description,
                    });
                }
                return returnData;
            },
            async loadActiveResponders() {
                // request the enabled responders from instance
                const requestResult = await cortexApiRequest.call(this, 'GET', '/responder');
                const returnData = [];
                for (const responder of requestResult) {
                    returnData.push({
                        name: responder.name,
                        value: `${responder.id}::${responder.name}`,
                        description: responder.description,
                    });
                }
                return returnData;
            },
            async loadObservableOptions() {
                const selectedAnalyzerId = this.getNodeParameter('analyzer').split('::')[0];
                // request the analyzers from instance
                const requestResult = await cortexApiRequest.call(this, 'GET', `/analyzer/${selectedAnalyzerId}`);
                // parse supported observable types  into options
                const returnData = [];
                for (const dataType of requestResult.dataTypeList) {
                    returnData.push({
                        name: upperFirst(dataType),
                        value: dataType,
                    });
                }
                return returnData;
            },
            async loadDataTypeOptions() {
                const selectedResponderId = this.getNodeParameter('responder').split('::')[0];
                // request the responder from instance
                const requestResult = await cortexApiRequest.call(this, 'GET', `/responder/${selectedResponderId}`);
                // parse the accepted dataType into options
                const returnData = [];
                for (const dataType of requestResult.dataTypeList) {
                    returnData.push({
                        value: dataType.split(':')[1],
                        name: changeCase.capitalCase(dataType.split(':')[1]),
                    });
                }
                return returnData;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            try {
                if (resource === 'analyzer') {
                    //https://github.com/TheHive-Project/CortexDocs/blob/master/api/api-guide.md#run
                    if (operation === 'execute') {
                        let force = false;
                        const analyzer = this.getNodeParameter('analyzer', i);
                        const observableType = this.getNodeParameter('observableType', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const tlp = this.getNodeParameter('tlp', i);
                        const body = {
                            dataType: observableType,
                            tlp,
                        };
                        if (additionalFields.force === true) {
                            force = true;
                        }
                        if (observableType === 'file') {
                            const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
                            const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                            const fileBufferData = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                            const options = {
                                formData: {
                                    data: {
                                        value: fileBufferData,
                                        options: {
                                            contentType: binaryData.mimeType,
                                            filename: binaryData.fileName,
                                        },
                                    },
                                    _json: JSON.stringify({
                                        dataType: observableType,
                                        tlp,
                                    }),
                                },
                            };
                            responseData = (await cortexApiRequest.call(this, 'POST', `/analyzer/${analyzer.split('::')[0]}/run`, {}, { force }, '', options));
                        }
                        else {
                            const observableValue = this.getNodeParameter('observableValue', i);
                            body.data = observableValue;
                            responseData = (await cortexApiRequest.call(this, 'POST', `/analyzer/${analyzer.split('::')[0]}/run`, body, { force }));
                        }
                        if (additionalFields.timeout) {
                            responseData = await cortexApiRequest.call(this, 'GET', `/job/${responseData.id}/waitreport`, {}, { atMost: `${additionalFields.timeout}second` });
                        }
                    }
                }
                if (resource === 'job') {
                    //https://github.com/TheHive-Project/CortexDocs/blob/master/api/api-guide.md#get-details-1
                    if (operation === 'get') {
                        const jobId = this.getNodeParameter('jobId', i);
                        responseData = await cortexApiRequest.call(this, 'GET', `/job/${jobId}`);
                    }
                    //https://github.com/TheHive-Project/CortexDocs/blob/master/api/api-guide.md#get-details-and-report
                    if (operation === 'report') {
                        const jobId = this.getNodeParameter('jobId', i);
                        responseData = await cortexApiRequest.call(this, 'GET', `/job/${jobId}/report`);
                    }
                }
                if (resource === 'responder') {
                    if (operation === 'execute') {
                        const responderId = this.getNodeParameter('responder', i).split('::')[0];
                        const entityType = this.getNodeParameter('entityType', i);
                        const isJSON = this.getNodeParameter('jsonObject', i);
                        let body;
                        if (isJSON) {
                            const entityJson = JSON.parse(this.getNodeParameter('objectData', i));
                            body = {
                                responderId,
                                label: getEntityLabel(entityJson),
                                dataType: `thehive:${entityType}`,
                                data: entityJson,
                                tlp: entityJson.tlp || 2,
                                pap: entityJson.pap || 2,
                                message: entityJson.message || '',
                                parameters: [],
                            };
                        }
                        else {
                            const values = this.getNodeParameter('parameters', i)
                                .values;
                            body = {
                                responderId,
                                dataType: `thehive:${entityType}`,
                                data: {
                                    _type: entityType,
                                    ...prepareParameters(values),
                                },
                            };
                            if (entityType === 'alert') {
                                // deal with alert artifacts
                                const artifacts = body.data.artifacts;
                                if (artifacts) {
                                    const artifactValues = artifacts.artifactValues;
                                    if (artifactValues) {
                                        const artifactData = [];
                                        for (const artifactvalue of artifactValues) {
                                            const element = {};
                                            element.message = artifactvalue.message;
                                            element.tags = splitTags(artifactvalue.tags);
                                            element.dataType = artifactvalue.dataType;
                                            element.data = artifactvalue.data;
                                            if (artifactvalue.dataType === 'file') {
                                                const binaryPropertyName = artifactvalue.binaryProperty;
                                                const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                                                element.data = `${binaryData.fileName};${binaryData.mimeType};${binaryData.data}`;
                                            }
                                            artifactData.push(element);
                                        }
                                        body.data.artifacts = artifactData;
                                    }
                                }
                            }
                            if (entityType === 'case_artifact') {
                                // deal with file observable
                                if (body.data.dataType === 'file') {
                                    const binaryPropertyName = body.data
                                        .binaryPropertyName;
                                    const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                                    const fileBufferData = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                                    const sha256 = createHash('sha256').update(fileBufferData).digest('hex');
                                    body.data.attachment = {
                                        name: binaryData.fileName,
                                        hashes: [
                                            sha256,
                                            createHash('sha1').update(fileBufferData).digest('hex'),
                                            createHash('md5').update(fileBufferData).digest('hex'),
                                        ],
                                        size: fileBufferData.byteLength,
                                        contentType: binaryData.mimeType,
                                        id: sha256,
                                    };
                                    delete body.data.binaryPropertyName;
                                }
                            }
                            // add the job label after getting all entity attributes
                            body = {
                                label: getEntityLabel(body.data),
                                ...body,
                            };
                        }
                        responseData = (await cortexApiRequest.call(this, 'POST', `/responder/${responderId}/run`, body));
                    }
                }
                if (Array.isArray(responseData)) {
                    returnData.push.apply(returnData, responseData);
                }
                else if (responseData !== undefined) {
                    returnData.push(responseData);
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ error: error.message });
                    continue;
                }
                throw error;
            }
        }
        return [this.helpers.returnJsonArray(returnData)];
    }
}
//# sourceMappingURL=Cortex.node.js.map