import type { IExecuteFunctions, INodeType } from 'n8n-workflow';

import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';

export class MiniMax implements INodeType {
	description = versionDescription;

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
