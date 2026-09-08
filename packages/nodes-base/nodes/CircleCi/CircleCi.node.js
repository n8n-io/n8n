import { NodeConnectionTypes } from 'n8n-workflow';
import { circleciApiRequest, circleciApiRequestAllItems } from './GenericFunctions';
import { pipelineFields, pipelineOperations } from './PipelineDescription';
export class CircleCi {
    description = {
        displayName: 'CircleCI',
        name: 'circleCi',
        icon: { light: 'file:circleCi.svg', dark: 'file:circleCi.dark.svg' },
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume CircleCI API',
        defaults: {
            name: 'CircleCI',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'circleCiApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Pipeline',
                        value: 'pipeline',
                    },
                ],
                default: 'pipeline',
            },
            ...pipelineOperations,
            ...pipelineFields,
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        const qs = {};
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            try {
                if (resource === 'pipeline') {
                    if (operation === 'get') {
                        const vcs = this.getNodeParameter('vcs', i);
                        let slug = this.getNodeParameter('projectSlug', i);
                        const pipelineNumber = this.getNodeParameter('pipelineNumber', i);
                        slug = slug.replace(new RegExp(/\//g), '%2F');
                        const endpoint = `/project/${vcs}/${slug}/pipeline/${pipelineNumber}`;
                        responseData = await circleciApiRequest.call(this, 'GET', endpoint, {}, qs);
                        responseData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                    }
                    if (operation === 'getAll') {
                        const vcs = this.getNodeParameter('vcs', i);
                        const filters = this.getNodeParameter('filters', i);
                        const returnAll = this.getNodeParameter('returnAll', i);
                        let slug = this.getNodeParameter('projectSlug', i);
                        slug = slug.replace(new RegExp(/\//g), '%2F');
                        if (filters.branch) {
                            qs.branch = filters.branch;
                        }
                        const endpoint = `/project/${vcs}/${slug}/pipeline`;
                        if (returnAll) {
                            responseData = await circleciApiRequestAllItems.call(this, 'items', 'GET', endpoint, {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await circleciApiRequest.call(this, 'GET', endpoint, {}, qs);
                            responseData = responseData.items;
                            responseData = responseData.splice(0, qs.limit);
                        }
                        responseData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                    }
                    if (operation === 'trigger') {
                        const vcs = this.getNodeParameter('vcs', i);
                        let slug = this.getNodeParameter('projectSlug', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        slug = slug.replace(new RegExp(/\//g), '%2F');
                        const endpoint = `/project/${vcs}/${slug}/pipeline`;
                        const body = {};
                        if (additionalFields.branch) {
                            body.branch = additionalFields.branch;
                        }
                        if (additionalFields.tag) {
                            body.tag = additionalFields.tag;
                        }
                        responseData = await circleciApiRequest.call(this, 'POST', endpoint, body, qs);
                        responseData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                    }
                }
                returnData.push(...responseData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ error: error.message, json: {}, itemIndex: i });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=CircleCi.node.js.map