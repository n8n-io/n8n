import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { BannerbearV1 } from './v1/BannerbearV1.node';
import { BannerbearV2 } from './v2/BannerbearV2.node';

export class Bannerbear extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Bannerbear',
			name: 'bannerbear',
			// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
			icon: 'file:bannerbear.png',
			group: ['output'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume Bannerbear API',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new BannerbearV1(baseDescription),
			2: new BannerbearV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
