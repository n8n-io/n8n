import { INodeTypeBaseDescription, IVersionedNodeType, VersionedNodeType } from 'n8n-workflow';

import { EmailSendV1 } from './v1/EmailSendV1.node';
import { EmailSendV2 } from './v2/EmailSendV2.node';

export class EmailSend extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Send Email',
			name: 'emailSend',
			icon: 'fa:envelope',
			group: ['output'],
			defaultVersion: 2,
			description: 'Sends an email using SMTP protocol',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new EmailSendV1(baseDescription),
			2: new EmailSendV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
