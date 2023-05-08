import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { AirtableTriggerV1 } from './v1/AirtableTriggerV1.node';

export class AirtableTrigger extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Airtable Trigger',
			name: 'airtableTrigger',
			icon: 'file:airtable.svg',
			group: ['trigger'],
			description: 'Starts the workflow when Airtable events occur',
			subtitle: '={{$parameter["event"]}}',
			defaultVersion: 1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new AirtableTriggerV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
