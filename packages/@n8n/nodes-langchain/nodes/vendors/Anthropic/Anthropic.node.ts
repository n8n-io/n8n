import type { IExecuteFunctions, INodeType } from 'n8n-workflow';

import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { listSearch } from './methods';

export class Anthropic implements INodeType {
	description = versionDescription;

	methods = {
		listSearch,
	};

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
