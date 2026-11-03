import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { calNodeDescription } from './actions/description';
import { router } from './actions/router';
import { listSearch } from './methods';

export class Cal implements INodeType {
	description: INodeTypeDescription = calNodeDescription;

	methods = { listSearch };

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
