import { VersionedNodeType } from 'n8n-workflow';
import { CalendlyTriggerV1 } from './v1/CalendlyTriggerV1.node';
import { CalendlyTriggerV2 } from './v2/CalendlyTriggerV2.node';
export class CalendlyTrigger extends VersionedNodeType {
    constructor() {
        const baseDescription = {
            displayName: 'Calendly Trigger',
            name: 'calendlyTrigger',
            icon: 'file:calendly.svg',
            group: ['trigger'],
            description: 'Starts the workflow when Calendly events occur',
            defaultVersion: 2,
        };
        const nodeVersions = {
            1: new CalendlyTriggerV1(baseDescription),
            2: new CalendlyTriggerV2(baseDescription),
        };
        super(nodeVersions, baseDescription);
    }
}
//# sourceMappingURL=CalendlyTrigger.node.js.map