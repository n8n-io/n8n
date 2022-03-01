import { NodeVersionedType } from '../../src/NodeVersionedType';
import {
	INodeTypeBaseDescription,
	INodeVersionedType,
} from 'n8n-workflow';

import {
	DiscordV1
} from './v1/DiscordV1.node';

import {
	DiscordV2
} from './v2/DiscordV2.node';


export class Discord extends NodeVersionedType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Discord',
			name: 'discord',
			icon: 'file:discord.svg',
			group: ['output'],
			defaultVersion: 2,
			description: 'Send messages to Discord',
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		};

		const nodeVersions: INodeVersionedType['nodeVersions'] = {
			1: new DiscordV1(baseDescription),
			2: new DiscordV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
}
}
