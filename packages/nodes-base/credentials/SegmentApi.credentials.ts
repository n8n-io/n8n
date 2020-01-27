import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SegmentApi implements ICredentialType {
	name = 'segmentApi';
	displayName = 'Segment API';
	properties = [
		{
			displayName: 'Write Key',
			name: 'writekey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
