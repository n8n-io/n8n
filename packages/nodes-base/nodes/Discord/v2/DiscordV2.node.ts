import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { listSearch, loadOptions } from './methods';
import { sendAndWaitWebhook } from '../../../utils/sendAndWait/utils';

export class DiscordV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
			usableAsTool: true,
		};
	}

	methods = {
		listSearch,
		loadOptions,
	};

	webhook = sendAndWaitWebhook;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await router.call(this);
	}
}
