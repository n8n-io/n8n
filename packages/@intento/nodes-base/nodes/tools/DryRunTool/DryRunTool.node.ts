import { DryRunDescriptor } from 'intento-translation';
import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { DryRunToolV1 } from './v1/DryRunToolV1.node';

export class DryRunTool extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: `${DryRunDescriptor.displayName}`,
			name: `${DryRunDescriptor.tool}`,
			group: ['transform'],
			description: `${DryRunDescriptor.description}`,
			icon: {
				light: 'file:dry-run.light.svg',
				dark: 'file:dry-run.dark.svg',
			},
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new DryRunToolV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
