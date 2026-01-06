import { DeeplDescriptor } from 'intento-translation';
import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { DeeplToolV1 } from './v1/DeeplToolV1.node';

export class DeeplTool extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: `${DeeplDescriptor.displayName}`,
			name: `${DeeplDescriptor.tool}`,
			group: ['transform'],
			description: `${DeeplDescriptor.description}`,
			icon: {
				light: 'file:deepl.dark.svg',
				dark: 'file:deepl.light.svg',
			},
			defaultVersion: 1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new DeeplToolV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
