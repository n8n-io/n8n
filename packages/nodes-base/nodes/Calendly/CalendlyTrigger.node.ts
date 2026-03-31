import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { CalendlyTrigger as CalendlyTriggerV1 } from './v1/CalendlyTriggerV1.node';
import { CalendlyTriggerV2 } from './v2/CalendlyTriggerV2.node';

export class CalendlyTrigger extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Calendly Trigger',
			name: 'calendlyTrigger',
			icon: 'file:calendly.svg',
			group: ['trigger'],
			description: 'Starts the workflow when Calendly events occur (API V2).',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new CalendlyTriggerV1(baseDescription),
			2: new CalendlyTriggerV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
