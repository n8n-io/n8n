import type { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';

import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { listSearch } from './methods';

export class AlibabaCloud implements INodeType {
	description = versionDescription;

	methods = {
		listSearch,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await router.call(this);
	}
}
