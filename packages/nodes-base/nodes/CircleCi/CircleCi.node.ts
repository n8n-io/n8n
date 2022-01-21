import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	pipelineFields,
	pipelineOperations,
} from './PipelineDescription';

import {
	circleciApiRequest,
	circleciApiRequestAllItems,
} from './GenericFunctions';

export class CircleCi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CircleCI',
		name: 'circleCi',
		icon: 'file:circleCi.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume CircleCI API',
		defaults: {
			name: 'CircleCI',
		},
		inputs: ['main'],
		outputs: ['main'],
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
				options: [
					{
						name: ' Pipeline',
						value: 'pipeline',
					},
				],
				default: 'pipeline',
				description: 'Resource to consume.',
			},
			...pipelineOperations,
			...pipelineFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'pipeline') {
					if (operation === 'get') {
						const vcs = this.getNodeParameter('vcs', i) as string;
						let slug = this.getNodeParameter('projectSlug', i) as string;
						const pipelineNumber = this.getNodeParameter('pipelineNumber', i) as number;

						slug = slug.replace(new RegExp(/\//g), '%2F');

						const endpoint = `/project/${vcs}/${slug}/pipeline/${pipelineNumber}`;

						responseData = await circleciApiRequest.call(this, 'GET', endpoint, {}, qs);
					}
					if (operation === 'getAll') {
						const vcs = this.getNodeParameter('vcs', i) as string;
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						let slug = this.getNodeParameter('projectSlug', i) as string;

						slug = slug.replace(new RegExp(/\//g), '%2F');

						if (filters.branch) {
							qs.branch = filters.branch;
						}

						const endpoint = `/project/${vcs}/${slug}/pipeline`;

						if (returnAll === true) {
							responseData = await circleciApiRequestAllItems.call(this, 'items', 'GET', endpoint, {}, qs);

						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;
							responseData = await circleciApiRequest.call(this, 'GET', endpoint, {}, qs);
							responseData = responseData.items;
							responseData = responseData.splice(0, qs.limit);
						}
					}

					if (operation === 'trigger') {
						const vcs = this.getNodeParameter('vcs', i) as string;
						let slug = this.getNodeParameter('projectSlug', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						slug = slug.replace(new RegExp(/\//g), '%2F');

						const endpoint = `/project/${vcs}/${slug}/pipeline`;

						const body: IDataObject = {};

						if (additionalFields.branch) {
							body.branch = additionalFields.branch as string;
						}

						if (additionalFields.tag) {
							body.tag = additionalFields.tag as string;
						}

						responseData = await circleciApiRequest.call(this, 'POST', endpoint, body, qs);
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
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
