import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { DiscordV1 } from './v1/DiscordV1.node';
import { DiscordV2 } from './v2/DiscordV2.node';

export class Discord extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Discord',
			name: 'discord',
			icon: 'file:discord.svg',
			group: ['output'],
			defaultVersion: 2,
			description: 'Sends data to Discord',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new DiscordV1(baseDescription),
			2: new DiscordV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
