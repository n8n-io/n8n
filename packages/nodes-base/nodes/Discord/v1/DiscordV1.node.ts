import {
	IExecuteFunctions,
} from 'n8n-core';
import { INodeType } from 'n8n-workflow';
import { INodeTypeBaseDescription } from 'n8n-workflow';
import { INodeTypeDescription } from 'n8n-workflow';

export class DiscordV1 implements INodeType {
	description: INodeTypeDescription;
	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			displayName: 'Discord',
			name: 'discord',
			icon: 'file:discord.svg',
			group: ['output'],
			version: 1,
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume Discord API',
			defaults: {
				name: 'Discord',
				color: '#000000',
			},
			inputs: ['main'],
			outputs: ['main'],
			properties:[],
		};
	}

}
