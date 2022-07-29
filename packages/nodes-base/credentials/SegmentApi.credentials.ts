import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SegmentApi implements ICredentialType {
	name = 'segmentApi';
	displayName = 'Segment API';
	documentationUrl = 'segment';
	properties: INodeProperties[] = [
		{
			displayName: 'Write Key',
			name: 'writekey',
			type: 'string',
			default: '',
		},
	];
}
