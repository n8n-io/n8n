import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { AwsS3V1 } from './V1/AwsS3V1.node';
import { AwsS3V2 } from './V2/AwsS3V2.node';

export class AwsS3 extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'AwsS3',
			name: 'awsS3',
			icon: 'file:s3.svg',
			group: ['output'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Sends data to AWS S3',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new AwsS3V1(baseDescription),
			2: new AwsS3V2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
