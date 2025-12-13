import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { DryRunProviderV1 } from './v1/DryRunProviderV1.node';

export class DryRunProvider extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'DryRun Provider',
			name: 'dryRunTranslationProvider',
			group: ['transform'],
			description: 'A tool for testing and validation that returns input data as-is',
			icon: {
				light: 'file:dryRunProvider.light.svg',
				dark: 'file:dryRunProvider.dark.svg',
			},
		};

		// eslint-disable-next-line @typescript-eslint/naming-convention
		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new DryRunProviderV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
