import { VersionedNodeType } from 'n8n-workflow';
import { EmailSendV1 } from './v1/EmailSendV1.node';
import { EmailSendV2 } from './v2/EmailSendV2.node';
export class EmailSend extends VersionedNodeType {
    constructor() {
        const baseDescription = {
            displayName: 'Send Email',
            name: 'emailSend',
            icon: 'node:send-mail',
            iconColor: 'black',
            group: ['output'],
            defaultVersion: 2.1,
            description: 'Sends an email using SMTP protocol',
        };
        const nodeVersions = {
            1: new EmailSendV1(baseDescription),
            2: new EmailSendV2(baseDescription),
            2.1: new EmailSendV2(baseDescription),
        };
        super(nodeVersions, baseDescription);
    }
}
//# sourceMappingURL=EmailSend.node.js.map