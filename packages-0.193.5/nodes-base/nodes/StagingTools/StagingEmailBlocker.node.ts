import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {getStageFromEnv} from '../utils/utilities';
import {isValid} from "./herlpers";

export class StagingEmailBlocker implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'StagingEmailBlocker',
		name: 'stagingEmailBlocker',
		icon: 'file:email-block-svgrepo-com.svg',
		group: ['transform'],
		version: 1,
		description: 'Block data with email based on stages',
		defaults: {
			name: 'StagingEmailBlocker',
			color: '#ffb500',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [],
		properties: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				required: true,
				default: '',
				description: 'Email to be checked',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const email = this.getNodeParameter('email', 0) as string;
		const stage = getStageFromEnv();
		console.log('Debug: email=', email);
		console.log('DEBUG: stage=', stage);
		const canPass = isValid(stage, email);
		const item = this.getInputData();
		return canPass? [item]: [this.helpers.returnJsonArray([])];
	}
}
