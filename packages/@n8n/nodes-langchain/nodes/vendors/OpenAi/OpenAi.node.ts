import type { IExecuteFunctions, INodeType } from 'n8n-workflow';

import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { listSearch, loadOptions } from './methods';

export class OpenAi implements INodeType {
	description = versionDescription;

	methods = {
		listSearch,
		loadOptions,
	};

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
