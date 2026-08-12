import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { confluenceNodeDescription } from './actions/description';
import { router } from './actions/router';

export class Confluence implements INodeType {
	description: INodeTypeDescription = confluenceNodeDescription;

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
