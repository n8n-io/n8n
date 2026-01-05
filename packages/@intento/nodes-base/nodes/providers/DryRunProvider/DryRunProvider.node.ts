import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { DryRunProviderV1 } from './v1/DryRunProviderV1.node';

export class DryRunProvider extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Dry Run Provider',
			name: 'dryRunProvider',
			group: ['transform'],
			description: 'A tool for testing and validation that returns input data as-is',
			icon: {
				light: 'file:dry-run.light.svg',
				dark: 'file:dry-run.dark.svg',
			},
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new DryRunProviderV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
