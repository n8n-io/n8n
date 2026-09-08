import { VersionedNodeType } from 'n8n-workflow';
import { CalTriggerV1 } from './v1/CalTriggerV1.node';
import { CalTriggerV2 } from './v2/CalTriggerV2.node';
export class CalTrigger extends VersionedNodeType {
    constructor() {
        const baseDescription = {
            displayName: 'Cal.com Trigger',
            name: 'calTrigger',
            icon: { light: 'file:cal.svg', dark: 'file:cal.dark.svg' },
            group: ['trigger'],
            description: 'Handle Cal.com events via webhooks',
            defaultVersion: 3,
        };
        const nodeVersions = {
            1: new CalTriggerV1(baseDescription),
            2: new CalTriggerV1(baseDescription),
            3: new CalTriggerV2(baseDescription),
        };
        super(nodeVersions, baseDescription);
    }
}
//# sourceMappingURL=CalTrigger.node.js.map