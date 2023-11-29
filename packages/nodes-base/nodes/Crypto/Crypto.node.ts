import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { CryptoV1 } from './v1/CryptoV1';
import { CryptoV2 } from './v2/CryptoV2';

export class Crypto extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Crypto',
			name: 'crypto',
			icon: 'fa:key',
			group: ['transform'],
			subtitle: '={{$parameter["action"]}}',
			description: 'Provide cryptographic utilities',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new CryptoV1(baseDescription),
			2: new CryptoV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
