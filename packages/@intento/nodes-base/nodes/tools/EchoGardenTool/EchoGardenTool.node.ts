import { EchoGardenDescriptor } from 'intento-translation';
import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { EchoGardenToolV1 } from './v1/EchoGardenToolV1.node';

export class EchoGardenTool extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: `${EchoGardenDescriptor.displayName}`,
			name: `${EchoGardenDescriptor.tool}`,
			group: ['transform'],
			description: `${EchoGardenDescriptor.description}`,
			icon: 'file:echogarden.svg',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new EchoGardenToolV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
