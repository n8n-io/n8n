import type { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';

import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';

export class AlibabaCloud implements INodeType {
	description = versionDescription;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await router.call(this);
	}
}
