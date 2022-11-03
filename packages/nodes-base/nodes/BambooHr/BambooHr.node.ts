import { IExecuteFunctions } from 'n8n-core';

import { INodeType, INodeTypeBaseDescription, INodeTypeDescription } from 'n8n-workflow';

import { router } from './v1/actions/router';
import { versionDescription } from './v1/actions/versionDescription';
import { loadOptions } from './v1/methods';
import { credentialTest } from './v1/methods';

export class BambooHr implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		loadOptions,
		credentialTest,
	};

	async execute(this: IExecuteFunctions) {
		return [await router.call(this)];
	}
}
