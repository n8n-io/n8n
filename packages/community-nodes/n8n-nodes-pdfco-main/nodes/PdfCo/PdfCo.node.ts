import {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	INodeTypeBaseDescription,
	ILoadOptionsFunctions
} from 'n8n-workflow';

import { router } from './actions/router';
import { descriptions } from './Descriptions';
import { loadResource } from './GenericFunctions';

export class PdfCo implements INodeType {

	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...descriptions
		};
	}

	methods = {
		loadOptions: {
				async getFonts(this: ILoadOptionsFunctions) {
					return await loadResource.call(this, 'fonts');
				},
				async getLanguages(this: ILoadOptionsFunctions) {
					return await loadResource.call(this, 'languages');
				},
		},
	};

  async execute(this: IExecuteFunctions) {
		return [await router.call(this)];
	}
}
