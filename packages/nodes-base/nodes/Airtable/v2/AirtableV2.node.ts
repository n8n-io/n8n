import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	INodeTypeBaseDescription,
	// ILoadOptionsFunctions,
} from 'n8n-workflow';

import { versionDescription } from './actions/versionDescription';
import { router } from './actions/router';
import { listSearch, loadOptions, resourceMapping } from './methods';

export class AirtableV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		listSearch,
		loadOptions,
		resourceMapping,
		// actionHandlers: {
		// 	async generateCodeUsingAiService(this: ILoadOptionsFunctions) {
		// 		const instructions = this.getNodeParameter('instructions') as string;
		// 		return instructions;
		// 	},
		// },
	};

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
